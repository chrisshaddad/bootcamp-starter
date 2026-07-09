import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  OpportunityListQuery,
  OpportunityListResponse,
  OpportunityStatus,
  OpportunityResponse,
  OpportunityCreateRequest,
  OpportunityUpdateRequest,
} from '@repo/contracts';
import type { OpportunityStatus as DatabaseOpportunityStatus } from '@repo/db';

type OpportunityRecord = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED';
  deadline: Date | null;
  requiredLevel: number | null;
  organizationId: string;
  requiresManagerApproval: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  department: { id: string; name: string } | null;
  hiringManager: { id: string; email: string; name: string } | null;
  opportunitySkills: {
    requiredLevel: number;
    skill: { id: string; name: string; category: string };
  }[];
  _count: { applications: number };
};

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: OpportunityListQuery,
    currentUser: User,
  ): Promise<OpportunityListResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const skip = (query.page - 1) * query.limit;
    const organizationId = currentUser.organizationId;
    const where = {
      ...(currentUser.role === 'SUPER_ADMIN'
        ? {}
        : { organizationId: organizationId as string }),
      status: query.status ?? 'OPEN',
    };

    const [opportunities, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          status: true,
          deadline: true,
          requiredLevel: true,
          organizationId: true,
          requiresManagerApproval: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          hiringManager: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          opportunitySkills: {
            select: {
              requiredLevel: true,
              skill: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
            orderBy: {
              skill: {
                name: 'asc',
              },
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    const opportunityRecords = opportunities as unknown as OpportunityRecord[];

    return {
      opportunities: opportunityRecords.map((opportunity) =>
        this.toResponse(opportunity),
      ),
      total,
    };
  }

  async findOne(id: string, currentUser: User): Promise<OpportunityResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const where: Prisma.OpportunityWhereInput =
      currentUser.role === 'SUPER_ADMIN'
        ? { id }
        : { id, organizationId: currentUser.organizationId as string };

    const opportunity = await this.prisma.opportunity.findFirst({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        status: true,
        deadline: true,
        requiredLevel: true,
        organizationId: true,
        requiresManagerApproval: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        hiringManager: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        opportunitySkills: {
          select: {
            requiredLevel: true,
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: {
            skill: {
              name: 'asc',
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    return this.toResponse(opportunity as OpportunityRecord);
  }

  async create(
    data: OpportunityCreateRequest,
    currentUser: User,
  ): Promise<OpportunityResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const organizationId = currentUser.organizationId!;

    // Validate department belongs to org if provided
    if (data.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: data.departmentId,
          organizationId,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'Department must belong to the same organization',
        );
      }
    }

    // Validate hiring manager belongs to org if provided
    if (data.hiringManagerId) {
      const manager = await this.prisma.user.findFirst({
        where: {
          id: data.hiringManagerId,
          organizationId,
        },
      });

      if (!manager) {
        throw new BadRequestException(
          'Hiring manager must belong to the same organization',
        );
      }
    }

    // Validate all skills belong to org if provided
    if (data.requiredSkills && data.requiredSkills.length > 0) {
      const skillIds = data.requiredSkills.map((s) => s.skillId);
      const skills = await this.prisma.skill.findMany({
        where: {
          id: { in: skillIds },
          organizationId,
        },
      });

      if (skills.length !== skillIds.length) {
        throw new BadRequestException(
          'All skills must belong to the same organization',
        );
      }
    }

    // Create opportunity with skills
    const { requiredSkills, ...opportunityData } = data;
    const opportunity = await this.prisma.opportunity.create({
      data: {
        ...opportunityData,
        organizationId,
        status: data.status ?? 'DRAFT',
        ...(requiredSkills && requiredSkills.length > 0
          ? {
              opportunitySkills: {
                createMany: {
                  data: requiredSkills,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        status: true,
        deadline: true,
        requiredLevel: true,
        organizationId: true,
        requiresManagerApproval: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        hiringManager: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        opportunitySkills: {
          select: {
            requiredLevel: true,
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: {
            skill: {
              name: 'asc',
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return this.toResponse(opportunity as OpportunityRecord);
  }

  async update(
    id: string,
    data: OpportunityUpdateRequest,
    currentUser: User,
  ): Promise<OpportunityResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Verify opportunity exists and belongs to user's org
    const existing = await this.prisma.opportunity.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
    });

    if (!existing) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    // Prevent updates if status is FILLED
    if (existing.status === 'FILLED') {
      throw new BadRequestException(
        'Cannot update opportunity with FILLED status',
      );
    }

    const organizationId = existing.organizationId;

    // Validate department if being changed
    if (data.departmentId !== undefined && data.departmentId !== null) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: data.departmentId,
          organizationId,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'Department must belong to the same organization',
        );
      }
    }

    // Validate hiring manager if being changed
    if (data.hiringManagerId !== undefined && data.hiringManagerId !== null) {
      const manager = await this.prisma.user.findFirst({
        where: {
          id: data.hiringManagerId,
          organizationId,
        },
      });

      if (!manager) {
        throw new BadRequestException(
          'Hiring manager must belong to the same organization',
        );
      }
    }

    // Validate skills if being changed
    if (data.requiredSkills && data.requiredSkills.length > 0) {
      const skillIds = data.requiredSkills.map((s) => s.skillId);
      const skills = await this.prisma.skill.findMany({
        where: {
          id: { in: skillIds },
          organizationId,
        },
      });

      if (skills.length !== skillIds.length) {
        throw new BadRequestException(
          'All skills must belong to the same organization',
        );
      }
    }

    // Update opportunity with skills transactionally
    const { requiredSkills, ...opportunityData } = data;

    const opportunity = await this.prisma.$transaction(async (tx) => {
      // Delete existing skills if new skills provided
      if (requiredSkills !== undefined) {
        await tx.opportunitySkill.deleteMany({
          where: { opportunityId: id },
        });

        // Create new skills if any
        if (requiredSkills.length > 0) {
          await tx.opportunitySkill.createMany({
            data: requiredSkills.map((skill) => ({
              opportunityId: id,
              ...skill,
            })),
          });
        }
      }

      // Update opportunity
      return tx.opportunity.update({
        where: { id },
        data: opportunityData,
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          status: true,
          deadline: true,
          requiredLevel: true,
          organizationId: true,
          requiresManagerApproval: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          hiringManager: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          opportunitySkills: {
            select: {
              requiredLevel: true,
              skill: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
            orderBy: {
              skill: {
                name: 'asc',
              },
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });
    });

    return this.toResponse(opportunity as OpportunityRecord);
  }

  async delete(id: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Verify opportunity exists and belongs to user's org
    const existing = await this.prisma.opportunity.findFirst({
      where:
        currentUser.role === 'SUPER_ADMIN'
          ? { id }
          : { id, organizationId: currentUser.organizationId as string },
      select: {
        id: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`);
    }

    // Prevent deletion if applications exist
    if (existing._count.applications > 0) {
      throw new BadRequestException(
        `Cannot delete opportunity. It has ${existing._count.applications} application(s)`,
      );
    }

    await this.prisma.opportunity.delete({ where: { id } });
  }

  private toResponse(opportunity: OpportunityRecord): OpportunityResponse {
    const status = this.toPublicStatus(opportunity.status);

    return {
      id: opportunity.id,
      title: opportunity.title,
      type: opportunity.type,
      description: opportunity.description,
      status,
      deadline: opportunity.deadline,
      requiredLevel: opportunity.requiredLevel,
      organizationId: opportunity.organizationId,
      requiresManagerApproval: opportunity.requiresManagerApproval,
      department: opportunity.department,
      hiringManager: opportunity.hiringManager,
      requiredSkills: opportunity.opportunitySkills.map(
        ({ skill, requiredLevel }) => ({
          ...skill,
          requiredLevel,
        }),
      ),
      applicationCount: opportunity._count.applications,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
    };
  }

  private toPublicStatus(status: DatabaseOpportunityStatus): OpportunityStatus {
    if (status === 'DRAFT') {
      return 'CLOSED';
    }

    return status;
  }
}

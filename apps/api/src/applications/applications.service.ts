import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  ApplicationCreateRequest,
  ApplicationUpdateRequest,
  ApplicationListQuery,
  ApplicationStatus,
  ApplicationResponse,
  ApplicationListResponse,
} from '@repo/contracts';
import type { ApplicationStatus as DatabaseApplicationStatus } from '@repo/db';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    body: ApplicationCreateRequest,
    currentUser: User,
  ): Promise<ApplicationResponse> {
    if (!currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const opportunity = await this.prisma.opportunity.findFirst({
      where: {
        id: body.opportunityId,
        organizationId: currentUser.organizationId,
      },
      select: {
        id: true,
        status: true,
        opportunitySkills: {
          select: {
            requiredLevel: true,
            skillId: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException(
        `Opportunity with ID ${body.opportunityId} not found`,
      );
    }

    if (opportunity.status !== 'OPEN') {
      throw new BadRequestException(
        'Opportunity is not accepting applications',
      );
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: {
        userId: currentUser.id,
      },
      select: {
        skillId: true,
        proficiencyLevel: true,
      },
    });

    try {
      const application = await this.prisma.application.create({
        data: {
          userId: currentUser.id,
          opportunityId: opportunity.id,
          coverNote: body.coverNote,
          status: 'PENDING',
          fitScore: this.calculateFitScore(
            opportunity.opportunitySkills,
            userSkills,
          ),
        },
        select: {
          id: true,
          userId: true,
          opportunityId: true,
          status: true,
          fitScore: true,
          coverNote: true,
          managerApproved: true,
          reviewerNotes: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          opportunity: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      });

      return {
        ...application,
        status: this.toPublicStatus(application.status),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You have already applied to this opportunity',
        );
      }
      throw error;
    }
  }

  async findAll(
    query: ApplicationListQuery,
    currentUser: User,
  ): Promise<ApplicationListResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    const skip = (query.page - 1) * query.limit;

    // Role-based filtering
    let where: Prisma.ApplicationWhereInput = {};

    if (query.team) {
      // Team scope (used by the manager-facing Team Overview screen): only
      // applications submitted by the current user's direct reports. Falls
      // through to an empty result set for non-managers, same as
      // OpportunitiesService's "mine" scoping.
      where = {
        user: {
          managerId: currentUser.id,
        },
      };
    } else if (currentUser.role === 'EMPLOYEE') {
      // Employees see only their own applications
      where = {
        userId: currentUser.id,
      };
    } else if (currentUser.role === 'HR' || currentUser.role === 'ORG_ADMIN') {
      // HR/ORG_ADMIN see all applications in their org
      where = {
        opportunity: {
          organizationId: currentUser.organizationId as string,
        },
      };
    }
    // SUPER_ADMIN sees all applications (no filter)

    // Add optional filters
    if (query.status) {
      where.status = query.status;
    }
    if (query.opportunityId) {
      where.opportunityId = query.opportunityId;
    }

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          opportunityId: true,
          status: true,
          fitScore: true,
          coverNote: true,
          managerApproved: true,
          reviewerNotes: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          opportunity: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      applications: applications.map((app) => ({
        ...app,
        status: this.toPublicStatus(app.status),
      })),
      total,
    };
  }

  async findOne(id: string, currentUser: User): Promise<ApplicationResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Role-based filtering for access
    let where: Prisma.ApplicationWhereInput = { id };

    if (currentUser.role === 'EMPLOYEE') {
      // Employees can only see their own applications
      where = {
        id,
        userId: currentUser.id,
      };
    } else if (currentUser.role === 'HR' || currentUser.role === 'ORG_ADMIN') {
      // HR/ORG_ADMIN can see applications in their org
      where = {
        id,
        opportunity: {
          organizationId: currentUser.organizationId as string,
        },
      };
    }
    // SUPER_ADMIN can see any application

    const application = await this.prisma.application.findFirst({
      where,
      select: {
        id: true,
        userId: true,
        opportunityId: true,
        status: true,
        fitScore: true,
        coverNote: true,
        managerApproved: true,
        reviewerNotes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return {
      ...application,
      status: this.toPublicStatus(application.status),
    };
  }

  async update(
    id: string,
    data: ApplicationUpdateRequest,
    currentUser: User,
  ): Promise<ApplicationResponse> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Find application with org check
    let where: Prisma.ApplicationWhereInput = { id };

    if (currentUser.role === 'EMPLOYEE') {
      where = {
        id,
        userId: currentUser.id,
      };
    } else if (currentUser.role === 'HR' || currentUser.role === 'ORG_ADMIN') {
      where = {
        id,
        opportunity: {
          organizationId: currentUser.organizationId as string,
        },
      };
    }

    const existing = await this.prisma.application.findFirst({
      where,
    });

    if (!existing) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Validate permissions based on role
    if (currentUser.role === 'EMPLOYEE') {
      // Employees can only withdraw their own applications
      if (data.status && data.status !== 'WITHDRAWN') {
        throw new ForbiddenException(
          'Employees can only withdraw their applications',
        );
      }
      if (
        data.reviewerNotes !== undefined ||
        data.managerApproved !== undefined
      ) {
        throw new ForbiddenException(
          'Employees cannot update reviewer notes or manager approval',
        );
      }
    }

    // Validate status transitions
    if (data.status) {
      const cannotModify: DatabaseApplicationStatus[] = [
        'ACCEPTED',
        'REJECTED',
        'WITHDRAWN',
      ];
      if (cannotModify.includes(existing.status)) {
        throw new BadRequestException(
          `Cannot modify application with ${existing.status} status`,
        );
      }
    }

    const application = await this.prisma.application.update({
      where: { id },
      data,
      select: {
        id: true,
        userId: true,
        opportunityId: true,
        status: true,
        fitScore: true,
        coverNote: true,
        managerApproved: true,
        reviewerNotes: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    return {
      ...application,
      status: this.toPublicStatus(application.status),
    };
  }

  async delete(id: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'SUPER_ADMIN' && !currentUser.organizationId) {
      this.logger.warn(`User ${currentUser.id} has no organization`);
      throw new ForbiddenException('Organization membership is required');
    }

    // Find application with org/ownership check
    let where: Prisma.ApplicationWhereInput = { id };

    if (currentUser.role === 'EMPLOYEE') {
      where = {
        id,
        userId: currentUser.id,
      };
    } else if (currentUser.role === 'HR' || currentUser.role === 'ORG_ADMIN') {
      where = {
        id,
        opportunity: {
          organizationId: currentUser.organizationId as string,
        },
      };
    }

    const existing = await this.prisma.application.findFirst({
      where,
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Only allow deletion of PENDING or WITHDRAWN applications (except SUPER_ADMIN)
    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      existing.status !== 'PENDING' &&
      existing.status !== 'WITHDRAWN'
    ) {
      throw new ForbiddenException(
        'You can only delete applications with PENDING or WITHDRAWN status',
      );
    }

    // Soft delete by setting status to WITHDRAWN (better audit trail)
    await this.prisma.application.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
    });
  }

  private toPublicStatus(status: DatabaseApplicationStatus): ApplicationStatus {
    switch (status) {
      case 'ACCEPTED':
      case 'REJECTED':
      case 'WITHDRAWN':
        return status;
      default:
        return 'PENDING';
    }
  }

  private calculateFitScore(
    requiredSkills: { skillId: string; requiredLevel: number }[],
    userSkills: { skillId: string; proficiencyLevel: number }[],
  ): number {
    if (requiredSkills.length === 0) {
      return 100;
    }

    const userSkillLevels = new Map(
      userSkills.map((skill) => [skill.skillId, skill.proficiencyLevel]),
    );

    const total = requiredSkills.reduce((sum, requiredSkill) => {
      if (requiredSkill.requiredLevel === 0) return sum + 1;
      const proficiencyLevel = userSkillLevels.get(requiredSkill.skillId) ?? 0;
      return sum + Math.min(proficiencyLevel / requiredSkill.requiredLevel, 1);
    }, 0);

    return Math.round((total / requiredSkills.length) * 100);
  }
}

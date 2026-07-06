import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  OpportunityListQuery,
  OpportunityListResponse,
  OpportunityStatus,
  OpportunityResponse,
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

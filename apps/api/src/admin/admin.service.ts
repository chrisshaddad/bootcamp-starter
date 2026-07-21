import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditAction,
  AdminAuditTargetType,
  Prisma,
  ProjectStatus,
} from '@repo/db';
import {
  adminAccountListResponseSchema,
  adminAccountResponseSchema,
  adminAuditLogListResponseSchema,
  adminAuditLogResponseSchema,
  adminOverviewResponseSchema,
  adminProjectListResponseSchema,
  adminProjectResponseSchema,
  type AdminAccountListQuery,
  type AdminAccountListResponse,
  type AdminAccountResponse,
  type AdminAccountStatusUpdate,
  type AdminAuditLogListQuery,
  type AdminAuditLogListResponse,
  type AdminAuditLogResponse,
  type AdminOverviewResponse,
  type AdminProjectListQuery,
  type AdminProjectListResponse,
  type AdminProjectModeration,
  type AdminProjectResponse,
} from '@repo/contracts';
import { SessionService } from '../auth/session.service';
import { DatabaseService } from '../database/prisma.service';

const accountInclude = () =>
  ({
    developerProfile: true,
    hiringProfile: true,
    connectedAccount: { select: { id: true } },
    _count: {
      select: {
        createdProjects: true,
        projectMemberships: true,
        sessions: { where: { expiresAt: { gt: new Date() } } },
      },
    },
  }) satisfies Prisma.UserInclude;

const projectInclude = {
  repository: { select: { fullName: true } },
  createdBy: {
    include: { developerProfile: true, hiringProfile: true },
  },
  _count: { select: { members: true } },
} satisfies Prisma.ProjectInclude;

const auditInclude = {
  actor: {
    include: { developerProfile: true, hiringProfile: true },
  },
} satisfies Prisma.AdminAuditLogInclude;

type AccountRecord = Prisma.UserGetPayload<{
  include: ReturnType<typeof accountInclude>;
}>;
type ProjectRecord = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;
type AuditRecord = Prisma.AdminAuditLogGetPayload<{
  include: typeof auditInclude;
}>;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly sessionService: SessionService,
  ) {}

  async getOverview(): Promise<AdminOverviewResponse> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [
      totalAccounts,
      developers,
      hiring,
      superAdmins,
      activeAccounts,
      suspendedAccounts,
      unconfirmedAccounts,
      githubConnectedDevelopers,
      recentAccounts,
      totalProjects,
      draftProjects,
      publishedProjects,
      archivedProjects,
      suspendedProjects,
      moderatedProjects,
      recentProjects,
      members,
      pendingInvitations,
      technologies,
      recentAuditLogs,
    ] = await Promise.all([
      this.database.user.count(),
      this.database.user.count({ where: { accountType: 'DEVELOPER' } }),
      this.database.user.count({ where: { accountType: 'HIRING' } }),
      this.database.user.count({ where: { accountType: 'SUPER_ADMIN' } }),
      this.database.user.count({ where: { status: 'ACTIVE' } }),
      this.database.user.count({ where: { status: 'SUSPENDED' } }),
      this.database.user.count({ where: { isConfirmed: false } }),
      this.database.user.count({
        where: {
          accountType: 'DEVELOPER',
          developerProfile: { githubUserId: { not: null } },
        },
      }),
      this.database.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.database.project.count(),
      this.database.project.count({ where: { status: 'DRAFT' } }),
      this.database.project.count({ where: { status: 'PUBLISHED' } }),
      this.database.project.count({ where: { status: 'ARCHIVED' } }),
      this.database.project.count({ where: { status: 'SUSPENDED' } }),
      this.database.project.count({ where: { moderatedAt: { not: null } } }),
      this.database.project.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.database.projectMember.count(),
      this.database.projectInvitation.count({ where: { status: 'PENDING' } }),
      this.database.technology.findMany({
        select: {
          name: true,
          slug: true,
          _count: { select: { projects: true } },
        },
        orderBy: { projects: { _count: 'desc' } },
        take: 8,
      }),
      this.database.adminAuditLog.findMany({
        include: auditInclude,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    return adminOverviewResponseSchema.parse({
      generatedAt: new Date(),
      accounts: {
        total: totalAccounts,
        developers,
        hiring,
        superAdmins,
        active: activeAccounts,
        suspended: suspendedAccounts,
        unconfirmed: unconfirmedAccounts,
        githubConnectedDevelopers,
        createdLast30Days: recentAccounts,
      },
      projects: {
        total: totalProjects,
        draft: draftProjects,
        published: publishedProjects,
        archived: archivedProjects,
        suspended: suspendedProjects,
        moderated: moderatedProjects,
        createdLast30Days: recentProjects,
      },
      collaboration: { members, pendingInvitations },
      topTechnologies: technologies.map((technology) => ({
        name: technology.name,
        slug: technology.slug,
        projectCount: technology._count.projects,
      })),
      recentAuditLogs: recentAuditLogs.map((log) => this.mapAuditLog(log)),
    });
  }

  async getAccounts(
    query: AdminAccountListQuery,
  ): Promise<AdminAccountListResponse> {
    const where: Prisma.UserWhereInput = {
      accountType: query.accountType,
      status: query.status,
      isConfirmed: query.confirmed,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              {
                developerProfile: {
                  displayName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                developerProfile: {
                  githubUsername: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                hiringProfile: {
                  organizationName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [accounts, totalItems] = await Promise.all([
      this.database.user.findMany({
        where,
        include: accountInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.database.user.count({ where }),
    ]);

    return adminAccountListResponseSchema.parse({
      data: accounts.map((account) => this.mapAccount(account)),
      meta: this.pagination(totalItems, query.page, query.limit),
    });
  }

  async updateAccountStatus(
    actorUserId: string,
    userId: string,
    input: AdminAccountStatusUpdate,
  ): Promise<AdminAccountResponse> {
    if (actorUserId === userId) {
      throw new ForbiddenException('You cannot change your own account status');
    }

    const existing = await this.database.user.findUnique({
      where: { id: userId },
      select: { id: true, accountType: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }
    if (existing.accountType === 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin accounts cannot be moderated');
    }
    if (existing.status === input.status) {
      throw new BadRequestException(
        `Account is already ${input.status.toLowerCase()}`,
      );
    }

    const action =
      input.status === 'SUSPENDED'
        ? AdminAuditAction.ACCOUNT_SUSPENDED
        : AdminAuditAction.ACCOUNT_REACTIVATED;
    const updated = await this.database.$transaction(async (tx) => {
      const transition = await tx.user.updateMany({
        where: { id: userId, status: existing.status },
        data: {
          status: input.status,
          suspendedAt: input.status === 'SUSPENDED' ? new Date() : null,
          suspensionReason: input.status === 'SUSPENDED' ? input.reason : null,
        },
      });
      if (transition.count === 0) {
        throw new ConflictException(
          'Account status changed concurrently; please retry',
        );
      }

      if (input.status === 'SUSPENDED') {
        await this.sessionService.deleteAllUserSessions(userId, tx);
      }

      await tx.adminAuditLog.create({
        data: {
          actorUserId,
          action,
          targetType: AdminAuditTargetType.USER,
          targetId: userId,
          reason: input.reason,
          metadata: {
            previousStatus: existing.status,
            nextStatus: input.status,
          },
        },
      });
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: accountInclude(),
      });
    });

    this.logger.log(`${action} target=${userId} actor=${actorUserId}`);
    return this.mapAccount(updated);
  }

  async getProjects(
    query: AdminProjectListQuery,
  ): Promise<AdminProjectListResponse> {
    const where: Prisma.ProjectWhereInput = {
      status: query.status,
      moderatedAt:
        query.moderated === undefined
          ? undefined
          : query.moderated
            ? { not: null }
            : null,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              {
                repository: {
                  fullName: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                createdBy: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [projects, totalItems] = await Promise.all([
      this.database.project.findMany({
        where,
        include: projectInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.database.project.count({ where }),
    ]);

    return adminProjectListResponseSchema.parse({
      data: projects.map((project) => this.mapProject(project)),
      meta: this.pagination(totalItems, query.page, query.limit),
    });
  }

  async moderateProject(
    actorUserId: string,
    projectId: string,
    input: AdminProjectModeration,
  ): Promise<AdminProjectResponse> {
    const existing = await this.database.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        status: true,
        moderatedAt: true,
        moderatedByUserId: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    if (input.action === 'SUSPEND' && existing.status === 'SUSPENDED') {
      throw new BadRequestException('Project is already suspended');
    }
    if (input.action === 'RESTORE' && existing.status !== 'SUSPENDED') {
      throw new BadRequestException(
        'Only a suspended project can be restored here',
      );
    }

    const action =
      input.action === 'SUSPEND'
        ? AdminAuditAction.PROJECT_SUSPENDED
        : AdminAuditAction.PROJECT_RESTORED;
    const nextStatus =
      input.action === 'SUSPEND'
        ? ProjectStatus.SUSPENDED
        : ProjectStatus.DRAFT;
    const updated = await this.database.$transaction(async (tx) => {
      const transition = await tx.project.updateMany({
        where: { id: projectId, status: existing.status },
        data: {
          status: nextStatus,
          moderatedAt: input.action === 'SUSPEND' ? new Date() : null,
          moderatedByUserId: input.action === 'SUSPEND' ? actorUserId : null,
          moderationReason: input.action === 'SUSPEND' ? input.reason : null,
          publishedAt: null,
        },
      });
      if (transition.count === 0) {
        throw new ConflictException(
          'Project status changed concurrently; please retry',
        );
      }

      await tx.adminAuditLog.create({
        data: {
          actorUserId,
          action,
          targetType: AdminAuditTargetType.PROJECT,
          targetId: projectId,
          reason: input.reason,
          metadata: { previousStatus: existing.status, nextStatus },
        },
      });
      return tx.project.findUniqueOrThrow({
        where: { id: projectId },
        include: projectInclude,
      });
    });

    this.logger.log(`${action} target=${projectId} actor=${actorUserId}`);
    return this.mapProject(updated);
  }

  async getAuditLogs(
    query: AdminAuditLogListQuery,
  ): Promise<AdminAuditLogListResponse> {
    const where: Prisma.AdminAuditLogWhereInput = {
      action: query.action,
      targetType: query.targetType,
      ...(query.search
        ? {
            OR: [
              { targetId: { contains: query.search, mode: 'insensitive' } },
              { reason: { contains: query.search, mode: 'insensitive' } },
              {
                actor: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [logs, totalItems] = await Promise.all([
      this.database.adminAuditLog.findMany({
        where,
        include: auditInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.database.adminAuditLog.count({ where }),
    ]);

    return adminAuditLogListResponseSchema.parse({
      data: logs.map((log) => this.mapAuditLog(log)),
      meta: this.pagination(totalItems, query.page, query.limit),
    });
  }

  private mapAccount(account: AccountRecord): AdminAccountResponse {
    return adminAccountResponseSchema.parse({
      id: account.id,
      email: account.email,
      displayName: this.displayName(account),
      accountType: account.accountType,
      status: account.status,
      isConfirmed: account.isConfirmed,
      githubUsername: account.developerProfile?.githubUsername ?? null,
      githubConnected: Boolean(account.connectedAccount?.id),
      suspensionReason: account.suspensionReason,
      suspendedAt: account.suspendedAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      counts: {
        ownedProjects: account._count.createdProjects,
        projectMemberships: account._count.projectMemberships,
        activeSessions: account._count.sessions,
      },
    });
  }

  private mapProject(project: ProjectRecord): AdminProjectResponse {
    return adminProjectResponseSchema.parse({
      id: project.id,
      title: project.title,
      slug: project.slug,
      status: project.status,
      repositoryFullName: project.repository.fullName,
      owner: {
        id: project.createdBy.id,
        email: project.createdBy.email,
        displayName: this.displayName(project.createdBy),
      },
      memberCount: project._count.members,
      moderationReason: project.moderationReason,
      moderatedAt: project.moderatedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      publishedAt: project.publishedAt,
    });
  }

  private mapAuditLog(log: AuditRecord): AdminAuditLogResponse {
    const metadata =
      log.metadata &&
      typeof log.metadata === 'object' &&
      !Array.isArray(log.metadata)
        ? log.metadata
        : null;
    return adminAuditLogResponseSchema.parse({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      reason: log.reason,
      metadata,
      createdAt: log.createdAt,
      actor: log.actor
        ? {
            id: log.actor.id,
            email: log.actor.email,
            displayName: this.displayName(log.actor),
          }
        : null,
    });
  }

  private displayName(account: {
    email: string;
    developerProfile?: { displayName: string } | null;
    hiringProfile?: { organizationName: string } | null;
  }): string {
    return (
      account.developerProfile?.displayName ??
      account.hiringProfile?.organizationName ??
      account.email
    );
  }

  private pagination(totalItems: number, currentPage: number, limit: number) {
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
    return {
      totalItems,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }
}

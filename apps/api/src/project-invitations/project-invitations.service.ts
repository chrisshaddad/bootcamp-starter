import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleInit,
} from '@nestjs/common';
import {
  projectCollaboratorSearchResponseSchema,
  projectInvitationListResponseSchema,
  projectInvitationPendingCountResponseSchema,
  type CreateProjectInvitationRequest,
  type ProjectCollaboratorSearchResponse,
  type ProjectInvitationListQuery,
  type ProjectInvitationListResponse,
  type ProjectInvitationPendingCountResponse,
  type ProjectInvitationResponse,
} from '@repo/contracts';
import {
  AccountType,
  Prisma,
  ProjectInvitationStatus,
  ProjectRoleKey,
  VerificationSource,
  VerificationStatus,
  type User,
} from '@repo/db';
import type { Queue } from 'bullmq';
import { DatabaseService } from '../database/prisma.service';
import { GithubService } from '../github/github.service';
import { MAIL_JOBS, MAIL_QUEUE } from '../mail/mail.constants';
import {
  mapProjectInvitation,
  projectInvitationInclude,
  type ProjectInvitationWithDetails,
} from './project-invitation.mapper';
import { ProjectInvitationRateLimiter } from './project-invitation-rate-limiter.service';
import { ProjectAccessService } from '../projects/project-access.service';
import {
  PROJECT_INVITATION_EXPIRY_MS,
  PROJECT_INVITATION_JOBS,
  PROJECT_INVITATIONS_QUEUE,
} from './project-invitations.constants';

@Injectable()
export class ProjectInvitationsService implements OnModuleInit {
  private readonly logger = new Logger(ProjectInvitationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly githubService: GithubService,
    private readonly rateLimiter: ProjectInvitationRateLimiter,
    private readonly projectAccess: ProjectAccessService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    @InjectQueue(PROJECT_INVITATIONS_QUEUE)
    private readonly invitationsQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;

    try {
      await this.invitationsQueue.upsertJobScheduler(
        PROJECT_INVITATION_JOBS.EXPIRE_PENDING,
        { every: 15 * 60 * 1000 },
        {
          name: PROJECT_INVITATION_JOBS.EXPIRE_PENDING,
          data: {},
          opts: { removeOnComplete: 20, removeOnFail: 50 },
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to schedule project invitation expiration cleanup.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async searchCollaborator(
    user: User,
    projectId: string,
    githubUsername: string,
  ): Promise<ProjectCollaboratorSearchResponse> {
    await this.rateLimiter.assertLookupAllowed(user.id, projectId);
    const candidate = await this.resolveCandidate(
      user,
      projectId,
      githubUsername,
    );

    await this.ensureCandidateIsAvailable(
      projectId,
      candidate.collaborator.githubUserId,
      candidate.platformUser.id,
    );

    return projectCollaboratorSearchResponseSchema.parse({
      githubUsername: candidate.collaborator.githubUsername,
      avatarUrl: candidate.collaborator.avatarUrl,
      githubPermission: candidate.collaborator.permission,
      githubRoleName: candidate.collaborator.roleName,
      platformUser: {
        displayName: candidate.platformUser.developerProfile!.displayName,
        publicSlug: candidate.platformUser.developerProfile!.publicSlug,
        profilePictureUrl:
          candidate.platformUser.developerProfile!.profilePictureUrl,
      },
    });
  }

  async createInvitation(
    user: User,
    projectId: string,
    data: CreateProjectInvitationRequest,
  ): Promise<ProjectInvitationResponse> {
    await this.rateLimiter.assertCreateAllowed(user.id, projectId);
    const candidate = await this.resolveCandidate(
      user,
      projectId,
      data.githubUsername,
    );
    await this.ensureCandidateIsAvailable(
      projectId,
      candidate.collaborator.githubUserId,
      candidate.platformUser.id,
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PROJECT_INVITATION_EXPIRY_MS);
    const pendingKey = `${projectId}:${candidate.collaborator.githubUserId}`;

    let invitation: ProjectInvitationWithDetails;
    try {
      invitation = await this.db.projectInvitation.create({
        data: {
          projectId,
          invitedByUserId: user.id,
          inviteeUserId: candidate.platformUser.id,
          inviteeGithubUserId: candidate.collaborator.githubUserId,
          inviteeGithubUsername: candidate.collaborator.githubUsername,
          requestedRole: data.role as ProjectRoleKey,
          contributionRoleLabel: data.contributionRoleLabel || null,
          githubPermission: candidate.collaborator.permission,
          githubRoleName: candidate.collaborator.roleName,
          status: ProjectInvitationStatus.PENDING,
          pendingKey,
          expiresAt,
        },
        include: projectInvitationInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A pending invitation already exists for this collaborator.',
        );
      }
      throw error;
    }

    try {
      await this.mailQueue.add(
        MAIL_JOBS.SEND_PROJECT_INVITATION,
        {
          email: candidate.platformUser.email,
          inviterName: candidate.inviterDisplayName,
          projectTitle: candidate.project.title,
          invitationLink: `${process.env.APP_URL ?? 'http://localhost:3000'}/invitations`,
        },
        {
          jobId: `project-invitation-${invitation.id}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      this.logger.error(
        `Project invitation ${invitation.id} email could not be queued; compensating the saved invitation.`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.db.projectInvitation.delete({ where: { id: invitation.id } });
      throw new ServiceUnavailableException(
        'The invitation could not be sent. Please try again.',
      );
    }

    return mapProjectInvitation(invitation);
  }

  async listProjectInvitations(
    user: User,
    projectId: string,
    query: ProjectInvitationListQuery,
  ): Promise<ProjectInvitationListResponse> {
    await this.getOwnerProject(user, projectId, false);
    await this.expirePendingInvitations({ projectId });
    return this.listInvitations({ projectId }, query);
  }

  async listInbox(
    user: User,
    query: ProjectInvitationListQuery,
  ): Promise<ProjectInvitationListResponse> {
    await this.expirePendingInvitations({ inviteeUserId: user.id });
    return this.listInvitations({ inviteeUserId: user.id }, query);
  }

  async getPendingCount(
    user: User,
  ): Promise<ProjectInvitationPendingCountResponse> {
    await this.expirePendingInvitations({ inviteeUserId: user.id });
    const pendingCount = await this.db.projectInvitation.count({
      where: {
        inviteeUserId: user.id,
        status: ProjectInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    return projectInvitationPendingCountResponseSchema.parse({ pendingCount });
  }

  async acceptInvitation(
    user: User,
    invitationId: string,
  ): Promise<ProjectInvitationResponse> {
    await this.expirePendingInvitations({
      id: invitationId,
      inviteeUserId: user.id,
    });
    const invitation = await this.getInvitationForInvitee(user, invitationId);
    await this.assertInvitationGithubIdentity(user, invitation);

    if (invitation.status === ProjectInvitationStatus.ACCEPTED) {
      return mapProjectInvitation(invitation);
    }
    this.assertPending(invitation.status);

    await this.githubService.verifyRepositoryOwnership(
      invitation.project.createdByUserId,
      invitation.project.repository.htmlUrl,
    );
    const collaborator = await this.githubService.verifyRepositoryCollaborator(
      invitation.project.createdByUserId,
      invitation.project.repository.fullName,
      invitation.inviteeGithubUsername,
    );

    if (collaborator.githubUserId !== invitation.inviteeGithubUserId) {
      throw new ForbiddenException(
        'The GitHub account for this invitation no longer matches.',
      );
    }

    const now = new Date();
    try {
      await this.db.$transaction(async (tx) => {
        const claimed = await tx.projectInvitation.updateMany({
          where: {
            id: invitation.id,
            status: ProjectInvitationStatus.PENDING,
            expiresAt: { gt: now },
          },
          data: {
            status: ProjectInvitationStatus.ACCEPTED,
            respondedAt: now,
            pendingKey: null,
            githubPermission: collaborator.permission,
            githubRoleName: collaborator.roleName,
            inviteeGithubUsername: collaborator.githubUsername,
          },
        });

        if (claimed.count !== 1) {
          throw new ConflictException(
            'This invitation is no longer available to accept.',
          );
        }

        await tx.projectMember.create({
          data: {
            projectId: invitation.projectId,
            userId: user.id,
            githubUserId: collaborator.githubUserId,
            githubUsername: collaborator.githubUsername,
            role: invitation.requestedRole,
            contributionRoleLabel: invitation.contributionRoleLabel,
            githubPermission: collaborator.permission,
            githubRoleName: collaborator.roleName,
            verificationStatus: VerificationStatus.VERIFIED,
            verificationSource: VerificationSource.GITHUB_COLLABORATOR,
            verifiedAt: now,
            addedByUserId: invitation.invitedByUserId,
          },
        });
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const current = await this.getInvitationDetails(invitationId);
        if (current.status === ProjectInvitationStatus.ACCEPTED) {
          return mapProjectInvitation(current);
        }
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const current = await this.getInvitationDetails(invitationId);
        if (current.status === ProjectInvitationStatus.ACCEPTED) {
          return mapProjectInvitation(current);
        }
        throw new ConflictException(
          'This collaborator is already a project member.',
        );
      }
      throw error;
    }

    return mapProjectInvitation(await this.getInvitationDetails(invitationId));
  }

  async declineInvitation(
    user: User,
    invitationId: string,
  ): Promise<ProjectInvitationResponse> {
    await this.expirePendingInvitations({
      id: invitationId,
      inviteeUserId: user.id,
    });
    const invitation = await this.getInvitationForInvitee(user, invitationId);
    if (invitation.status === ProjectInvitationStatus.DECLINED) {
      return mapProjectInvitation(invitation);
    }
    this.assertPending(invitation.status);

    const updated = await this.db.projectInvitation.updateMany({
      where: {
        id: invitation.id,
        status: ProjectInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: ProjectInvitationStatus.DECLINED,
        respondedAt: new Date(),
        pendingKey: null,
      },
    });
    if (updated.count !== 1) {
      const current = await this.getInvitationDetails(invitationId);
      if (current.status === ProjectInvitationStatus.DECLINED) {
        return mapProjectInvitation(current);
      }
      throw new ConflictException(
        'This invitation is no longer available to decline.',
      );
    }
    return mapProjectInvitation(await this.getInvitationDetails(invitationId));
  }

  async cancelInvitation(
    user: User,
    projectId: string,
    invitationId: string,
  ): Promise<ProjectInvitationResponse> {
    await this.getOwnerProject(user, projectId, false);
    await this.expirePendingInvitations({ id: invitationId, projectId });
    const invitation = await this.db.projectInvitation.findFirst({
      where: { id: invitationId, projectId },
      include: projectInvitationInclude,
    });
    if (!invitation) throw new NotFoundException('Invitation not found.');
    if (invitation.status === ProjectInvitationStatus.CANCELED) {
      return mapProjectInvitation(invitation);
    }
    this.assertPending(invitation.status);

    const updated = await this.db.projectInvitation.updateMany({
      where: {
        id: invitation.id,
        projectId,
        status: ProjectInvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: ProjectInvitationStatus.CANCELED,
        canceledAt: new Date(),
        pendingKey: null,
      },
    });
    if (updated.count !== 1) {
      const current = await this.getInvitationDetails(invitationId);
      if (current.status === ProjectInvitationStatus.CANCELED) {
        return mapProjectInvitation(current);
      }
      throw new ConflictException(
        'This invitation is no longer available to cancel.',
      );
    }
    return mapProjectInvitation(await this.getInvitationDetails(invitationId));
  }

  async expirePendingInvitations(
    scope: Prisma.ProjectInvitationWhereInput = {},
  ): Promise<number> {
    const result = await this.db.projectInvitation.updateMany({
      where: {
        ...scope,
        status: ProjectInvitationStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      data: {
        status: ProjectInvitationStatus.EXPIRED,
        respondedAt: new Date(),
        pendingKey: null,
      },
    });
    return result.count;
  }

  private async resolveCandidate(
    user: User,
    projectId: string,
    githubUsername: string,
  ) {
    const ownership = await this.getOwnerProject(user, projectId, true);
    const collaborator = await this.githubService.verifyRepositoryCollaborator(
      user.id,
      ownership.project.repository.fullName,
      githubUsername,
    );

    if (collaborator.githubUserId === ownership.ownerGithubUserId) {
      throw new BadRequestException(
        'The repository owner cannot be invited as a collaborator.',
      );
    }

    const platformUser = await this.db.user.findFirst({
      where: {
        accountType: AccountType.DEVELOPER,
        isConfirmed: true,
        developerProfile: { githubUserId: collaborator.githubUserId },
      },
      select: {
        id: true,
        email: true,
        developerProfile: {
          select: {
            displayName: true,
            publicSlug: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    if (!platformUser?.developerProfile) {
      throw new NotFoundException(
        'This GitHub user does not have a connected developer account on the platform.',
      );
    }

    return {
      project: ownership.project,
      collaborator,
      platformUser,
      inviterDisplayName: ownership.inviterDisplayName,
    };
  }

  private async ensureCandidateIsAvailable(
    projectId: string,
    githubUserId: bigint,
    userId: string,
  ): Promise<void> {
    await this.expirePendingInvitations({ projectId });
    const [member, pendingInvitation] = await Promise.all([
      this.db.projectMember.findFirst({
        where: {
          projectId,
          OR: [{ userId }, { githubUserId }],
        },
        select: { id: true },
      }),
      this.db.projectInvitation.findFirst({
        where: {
          projectId,
          inviteeGithubUserId: githubUserId,
          status: ProjectInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      }),
    ]);

    if (member) {
      throw new ConflictException(
        'This collaborator is already a project member.',
      );
    }
    if (pendingInvitation) {
      throw new ConflictException(
        'A pending invitation already exists for this collaborator.',
      );
    }
  }

  private async getOwnerProject(
    user: User,
    projectId: string,
    verifyWithGithub: boolean,
  ) {
    await this.projectAccess.assertCanManageInvitations(user, projectId);
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: {
        repository: true,
        createdBy: {
          select: {
            developerProfile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found.');
    let ownerGithubUserId = project.repository.ownerGithubUserId;
    if (verifyWithGithub) {
      const verified = await this.githubService.verifyRepositoryOwnership(
        user.id,
        project.repository.htmlUrl,
      );
      ownerGithubUserId = verified.ownerGithubUserId;
      const verifiedAt = new Date();
      await this.db.$transaction([
        this.db.repository.update({
          where: { id: project.repository.id },
          data: {
            ownerGithubUserId: verified.ownerGithubUserId,
            ownerLogin: verified.ownerLogin,
            ownerType: verified.ownerType,
            isFork: verified.isFork,
          },
        }),
        this.db.project.update({
          where: { id: project.id },
          data: { githubOwnershipVerifiedAt: verifiedAt },
        }),
        this.db.projectMember.upsert({
          where: {
            projectId_userId: { projectId: project.id, userId: user.id },
          },
          create: {
            projectId: project.id,
            userId: user.id,
            githubUserId: verified.ownerGithubUserId,
            githubUsername: verified.ownerLogin,
            role: ProjectRoleKey.OWNER,
            verificationStatus: VerificationStatus.VERIFIED,
            verificationSource: VerificationSource.GITHUB_OWNER,
            verifiedAt,
            addedByUserId: user.id,
          },
          update: {
            githubUserId: verified.ownerGithubUserId,
            githubUsername: verified.ownerLogin,
            role: ProjectRoleKey.OWNER,
            verificationStatus: VerificationStatus.VERIFIED,
            verificationSource: VerificationSource.GITHUB_OWNER,
            verifiedAt,
          },
        }),
      ]);
    }

    if (verifyWithGithub && !ownerGithubUserId) {
      throw new ForbiddenException(
        'GitHub repository ownership must be verified before managing invitations.',
      );
    }

    return {
      project,
      ownerGithubUserId,
      inviterDisplayName:
        project.createdBy.developerProfile?.displayName ?? 'A developer',
    };
  }

  private async listInvitations(
    scope: Prisma.ProjectInvitationWhereInput,
    query: ProjectInvitationListQuery,
  ): Promise<ProjectInvitationListResponse> {
    const where: Prisma.ProjectInvitationWhereInput = {
      ...scope,
      ...(query.status ? { status: query.status } : {}),
    };
    const [totalItems, invitations] = await Promise.all([
      this.db.projectInvitation.count({ where }),
      this.db.projectInvitation.findMany({
        where,
        include: projectInvitationInclude,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    const totalPages = Math.ceil(totalItems / query.limit);
    return projectInvitationListResponseSchema.parse({
      data: invitations.map(mapProjectInvitation),
      meta: {
        totalItems,
        currentPage: query.page,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    });
  }

  private async getInvitationForInvitee(user: User, invitationId: string) {
    const invitation = await this.db.projectInvitation.findUnique({
      where: { id: invitationId },
      include: {
        ...projectInvitationInclude,
        project: {
          include: { repository: true },
        },
      },
    });

    if (!invitation) throw new NotFoundException('Invitation not found.');
    if (invitation.inviteeUserId !== user.id) {
      throw new ForbiddenException('This invitation belongs to another user.');
    }

    return invitation;
  }

  private async assertInvitationGithubIdentity(
    user: User,
    invitation: ProjectInvitationWithDetails,
  ): Promise<void> {
    const profile = await this.db.developerProfile.findUnique({
      where: { userId: user.id },
      select: { githubUserId: true },
    });
    if (
      !profile?.githubUserId ||
      profile.githubUserId !== invitation.inviteeGithubUserId
    ) {
      throw new ForbiddenException(
        'Connect the GitHub account that received this invitation.',
      );
    }
  }

  private async getInvitationDetails(invitationId: string) {
    const invitation = await this.db.projectInvitation.findUnique({
      where: { id: invitationId },
      include: projectInvitationInclude,
    });
    if (!invitation) throw new NotFoundException('Invitation not found.');
    return invitation;
  }

  private assertPending(status: ProjectInvitationStatus): void {
    if (status !== ProjectInvitationStatus.PENDING) {
      throw new ConflictException(
        `This invitation is already ${status.toLowerCase()}.`,
      );
    }
  }
}

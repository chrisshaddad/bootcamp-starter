import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ProjectAccessResponse } from '@repo/contracts';
import {
  AccountType,
  ProjectStatus,
  ProjectRoleKey,
  VerificationStatus,
  type User,
} from '@repo/db';
import { DatabaseService } from '../database/prisma.service';

export type ProjectAccessContext = ProjectAccessResponse & {
  project: {
    id: string;
    createdByUserId: string;
  };
};

@Injectable()
export class ProjectAccessService {
  constructor(private readonly db: DatabaseService) {}

  async getAccess(
    user: User,
    projectId: string,
  ): Promise<ProjectAccessContext> {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        status: true,
        createdByUserId: true,
        members: {
          where: {
            userId: user.id,
            verificationStatus: VerificationStatus.VERIFIED,
          },
          select: { userId: true, role: true },
          take: 1,
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    return {
      project: { id: project.id, createdByUserId: project.createdByUserId },
      ...this.getAccessFromProject(user, project),
    };
  }

  getAccessFromProject(
    user: User,
    project: {
      createdByUserId: string;
      status: ProjectStatus;
      members: Array<{ userId: string | null; role: ProjectRoleKey }>;
    },
  ): ProjectAccessResponse {
    const isOwner = project.createdByUserId === user.id;
    const isSuperAdmin = user.accountType === AccountType.SUPER_ADMIN;
    const membershipRole = project.members.find(
      (member) => member.userId === user.id,
    )?.role;
    const collaborationRole =
      membershipRole === ProjectRoleKey.EDITOR ||
      membershipRole === ProjectRoleKey.CONTRIBUTOR
        ? membershipRole
        : null;
    const currentUserRole = isOwner ? ProjectRoleKey.OWNER : collaborationRole;
    const isEditor = currentUserRole === ProjectRoleKey.EDITOR;
    const isContributor = currentUserRole === ProjectRoleKey.CONTRIBUTOR;
    const isSuspended = project.status === ProjectStatus.SUSPENDED;

    return {
      currentUserRole,
      capabilities: {
        canView: isOwner || isEditor || isContributor || isSuperAdmin,
        canEditContent: !isSuspended && (isOwner || isEditor),
        canPublish: !isSuspended && isOwner,
        canManageInvitations: !isSuspended && isOwner,
        canDelete: !isSuspended && isOwner,
      },
    };
  }

  async assertCanView(user: User, projectId: string) {
    return this.assert(user, projectId, 'canView', 'view');
  }

  async assertCanEditContent(user: User, projectId: string) {
    return this.assert(user, projectId, 'canEditContent', 'edit');
  }

  async assertCanPublish(user: User, projectId: string) {
    return this.assert(user, projectId, 'canPublish', 'publish');
  }

  async assertCanManageInvitations(user: User, projectId: string) {
    return this.assert(
      user,
      projectId,
      'canManageInvitations',
      'manage invitations for',
    );
  }

  async assertCanDelete(user: User, projectId: string) {
    return this.assert(user, projectId, 'canDelete', 'delete');
  }

  private async assert(
    user: User,
    projectId: string,
    capability: keyof ProjectAccessResponse['capabilities'],
    action: string,
  ) {
    const access = await this.getAccess(user, projectId);
    if (!access.capabilities[capability]) {
      throw new ForbiddenException(
        `You are not authorized to ${action} this project`,
      );
    }
    return access;
  }
}

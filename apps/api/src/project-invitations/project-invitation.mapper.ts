import {
  projectInvitationResponseSchema,
  type ProjectInvitationResponse,
} from '@repo/contracts';
import type { Prisma } from '@repo/db';
import { normalizeMediaUrl } from '../common/utils/normalize-media-url';

export const projectInvitationInclude = {
  project: {
    select: {
      id: true,
      title: true,
      slug: true,
      repository: { select: { fullName: true } },
    },
  },
  invitedBy: {
    select: {
      id: true,
      developerProfile: {
        select: {
          displayName: true,
          publicSlug: true,
          profilePictureUrl: true,
        },
      },
    },
  },
  invitee: {
    select: {
      id: true,
      developerProfile: {
        select: {
          displayName: true,
          publicSlug: true,
          profilePictureUrl: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectInvitationInclude;

export type ProjectInvitationWithDetails = Prisma.ProjectInvitationGetPayload<{
  include: typeof projectInvitationInclude;
}>;

function mapInvitationUser(user: ProjectInvitationWithDetails['invitedBy']) {
  if (!user?.developerProfile) return null;
  return {
    id: user.id,
    displayName: user.developerProfile.displayName,
    publicSlug: user.developerProfile.publicSlug,
    profilePictureUrl: normalizeMediaUrl(
      user.developerProfile.profilePictureUrl,
    ),
  };
}

export function mapProjectInvitation(
  invitation: ProjectInvitationWithDetails,
): ProjectInvitationResponse {
  return projectInvitationResponseSchema.parse({
    id: invitation.id,
    project: {
      id: invitation.project.id,
      title: invitation.project.title,
      slug: invitation.project.slug,
      repositoryFullName: invitation.project.repository.fullName,
    },
    inviter: mapInvitationUser(invitation.invitedBy),
    invitee: mapInvitationUser(invitation.invitee),
    inviteeGithubUsername: invitation.inviteeGithubUsername,
    requestedRole: invitation.requestedRole,
    contributionRoleLabel: invitation.contributionRoleLabel,
    githubPermission: invitation.githubPermission,
    githubRoleName: invitation.githubRoleName,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString() ?? null,
    canceledAt: invitation.canceledAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
  });
}

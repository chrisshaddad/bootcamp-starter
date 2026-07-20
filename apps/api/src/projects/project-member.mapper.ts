import {
  projectMemberResponseSchema,
  type ProjectMemberResponse,
} from '@repo/contracts';
import type { Prisma } from '@repo/db';

type ProjectMemberWithPublicUser = Prisma.ProjectMemberGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        developerProfile: {
          select: {
            displayName: true;
            publicSlug: true;
            profilePictureUrl: true;
          };
        };
      };
    };
  };
}>;

export function mapProjectMember(
  member: ProjectMemberWithPublicUser,
): ProjectMemberResponse {
  return projectMemberResponseSchema.parse({
    id: member.id,
    githubUsername: member.githubUsername,
    role: member.role,
    contributionRoleLabel: member.contributionRoleLabel,
    contributionSummary: member.contributionSummary,
    githubPermission: member.githubPermission,
    githubRoleName: member.githubRoleName,
    verificationStatus: member.verificationStatus,
    verifiedAt: member.verifiedAt?.toISOString() ?? null,
    user: member.user?.developerProfile
      ? {
          id: member.user.id,
          displayName: member.user.developerProfile.displayName,
          publicSlug: member.user.developerProfile.publicSlug,
          profilePictureUrl:
            member.user.developerProfile.profilePictureUrl?.trim() || null,
        }
      : null,
  });
}

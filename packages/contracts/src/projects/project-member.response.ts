import { z } from 'zod';
import { projectRoleSchema } from './project-role.schema';

export const projectMemberResponseSchema = z.strictObject({
  id: z.uuid(),
  githubUsername: z.string().nullable(),
  role: projectRoleSchema,
  contributionRoleLabel: z.string().nullable(),
  contributionSummary: z.string().nullable(),
  githubPermission: z.string().nullable(),
  githubRoleName: z.string().nullable(),
  verificationStatus: z.literal('VERIFIED'),
  verifiedAt: z.iso.datetime().nullable(),
  user: z
    .strictObject({
      id: z.uuid(),
      displayName: z.string(),
      publicSlug: z.string(),
      profilePictureUrl: z.url().nullable(),
    })
    .nullable(),
});

export type ProjectMemberResponse = z.infer<typeof projectMemberResponseSchema>;

import { z } from 'zod';
import { projectInvitationStatusSchema } from './project-invitation-status.schema';

const invitationUserSchema = z.strictObject({
  id: z.uuid(),
  displayName: z.string(),
  publicSlug: z.string(),
  profilePictureUrl: z.url().nullable(),
});

export const projectInvitationResponseSchema = z.strictObject({
  id: z.uuid(),
  project: z.strictObject({
    id: z.uuid(),
    title: z.string(),
    slug: z.string(),
    repositoryFullName: z.string(),
  }),
  inviter: invitationUserSchema.nullable(),
  invitee: invitationUserSchema.nullable(),
  inviteeGithubUsername: z.string(),
  requestedRole: z.enum(['EDITOR', 'CONTRIBUTOR']),
  contributionRoleLabel: z.string().nullable(),
  githubPermission: z.string().nullable(),
  githubRoleName: z.string().nullable(),
  status: projectInvitationStatusSchema,
  expiresAt: z.iso.datetime(),
  respondedAt: z.iso.datetime().nullable(),
  canceledAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProjectInvitationResponse = z.infer<
  typeof projectInvitationResponseSchema
>;

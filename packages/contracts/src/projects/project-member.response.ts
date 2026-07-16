import { z } from 'zod';
import { dateSchema } from '../common';

export const projectMemberUserResponseSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  publicSlug: z.string(),
  profilePictureUrl: z.string().nullable().optional(),
  githubUsername: z.string().nullable().optional(),
});

export const projectMemberResponseSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['OWNER', 'EDITOR', 'CONTRIBUTOR']),
  githubUsername: z.string().nullable().optional(),
  contributionRoleLabel: z.string().nullable().optional(),
  contributionSummary: z.string().nullable().optional(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'UNVERIFIED']),
  user: projectMemberUserResponseSchema.nullable().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export type ProjectMemberResponse = z.infer<typeof projectMemberResponseSchema>;

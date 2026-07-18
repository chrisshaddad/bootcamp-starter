import { z } from 'zod';

export const createProjectInvitationRequestSchema = z.strictObject({
  githubUsername: z
    .string()
    .trim()
    .min(1, 'GitHub username is required')
    .max(39, 'GitHub username is too long')
    .regex(
      /^(?!-)(?!.*--)[A-Za-z0-9-]+(?<!-)$/,
      'Enter a valid GitHub username',
    ),
  role: z.enum(['EDITOR', 'CONTRIBUTOR']),
  contributionRoleLabel: z.string().trim().max(80).nullable().optional(),
});

export type CreateProjectInvitationRequest = z.infer<
  typeof createProjectInvitationRequestSchema
>;

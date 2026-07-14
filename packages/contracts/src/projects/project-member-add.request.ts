import { z } from 'zod';
export const addProjectMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  githubUsername: z.string().optional(),
  role: z.enum(['OWNER', 'EDITOR', 'CONTRIBUTOR']),
  contributionRoleLabel: z.string().nullable().optional(),
});
export type AddProjectMemberRequest = z.infer<typeof addProjectMemberSchema>;

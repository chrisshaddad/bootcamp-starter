import { z } from 'zod';

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  githubUsername: z.string().optional(),
  role: z.enum(['OWNER', 'EDITOR', 'CONTRIBUTOR']),
  contributionRoleLabel: z.string().nullable().optional(),
});

export const addProjectTechnologySchema = z.object({
  technologyId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});

export type AddProjectMemberRequest = z.infer<typeof addProjectMemberSchema>;
export type AddProjectTechnologyRequest = z.infer<
  typeof addProjectTechnologySchema
>;

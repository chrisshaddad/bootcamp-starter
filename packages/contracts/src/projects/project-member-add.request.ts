import { z } from 'zod';

export const addProjectMemberSchema = z
  .object({
    userId: z.string().uuid().optional(),
    githubUsername: z.string().optional(),
    role: z.enum(['OWNER', 'EDITOR', 'CONTRIBUTOR']),
    contributionRoleLabel: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      return Boolean(data.userId) !== Boolean(data.githubUsername);
    },
    {
      message: 'Must provide exactly one of userId or githubUsername',
      path: ['userId'],
    },
  );

export type AddProjectMemberRequest = z.infer<typeof addProjectMemberSchema>;

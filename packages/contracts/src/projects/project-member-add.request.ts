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
      const hasUserId = !!data.userId;
      const hasGithub = !!data.githubUsername;
      return (hasUserId || hasGithub) && !(hasUserId && hasGithub);
    },
    {
      message: 'Must provide exactly one of userId or githubUsername',
    },
  );

export type AddProjectMemberRequest = z.infer<typeof addProjectMemberSchema>;

import { z } from 'zod';

export const githubRepositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  isPrivate: z.boolean(),
  isImported: z.boolean(),
  url: z.string(),
  updatedAt: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
});

export const githubRepositoryListSchema = z.array(githubRepositorySchema);

export type GithubRepository = z.infer<typeof githubRepositorySchema>;
export type GithubRepositoryListResponse = z.infer<
  typeof githubRepositoryListSchema
>;

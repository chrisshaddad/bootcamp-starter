import { z } from 'zod';
import { dateSchema } from '../common';

export const githubRepositoryPreviewResponseSchema = z.strictObject({
  repository: z.strictObject({
    githubRepoId: z.string(),
    fullName: z.string(),
    ownerLogin: z.string(),
    repoName: z.string(),
    htmlUrl: z.url(),
    defaultBranch: z.string().nullable(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
    description: z.string().nullable(),
    lastPushedAt: dateSchema.nullable(),
  }),
  languages: z.array(
    z.strictObject({
      name: z.string(),
      bytes: z.number().int().nonnegative(),
    }),
  ),
});

export type GithubRepositoryPreviewResponse = z.infer<
  typeof githubRepositoryPreviewResponseSchema
>;

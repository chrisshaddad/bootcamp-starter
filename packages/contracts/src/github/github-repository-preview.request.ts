import { z } from 'zod';
import { githubRepositoryUrlSchema } from './github-repository-url.schema';

export const githubRepositoryPreviewRequestSchema = z.strictObject({
  repositoryUrl: githubRepositoryUrlSchema,
});

export type GithubRepositoryPreviewRequest = z.infer<
  typeof githubRepositoryPreviewRequestSchema
>;

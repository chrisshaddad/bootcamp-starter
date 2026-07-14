import { z } from 'zod';
import { githubRepositoryUrlSchema } from '../github';

export const importGithubProjectRequestSchema = z.strictObject({
  repositoryUrl: githubRepositoryUrlSchema,
  title: z.string().trim().min(1, 'Title is required').max(160).optional(),
  shortDescription: z.string().trim().min(1).max(500).nullable().optional(),
  fullDescription: z.string().trim().min(1).max(10_000).nullable().optional(),
  deploymentUrl: z.url('Invalid deployment URL').nullable().optional(),
});

export type ImportGithubProjectRequest = z.infer<
  typeof importGithubProjectRequestSchema
>;

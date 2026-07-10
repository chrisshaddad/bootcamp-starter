import { z } from 'zod';
import { dateSchema } from '../common';
import { githubTechnologyCategorySchema } from '../github';

export const importGithubProjectResponseSchema = z.strictObject({
  project: z.strictObject({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    status: z.literal('DRAFT'),
    shortDescription: z.string().nullable(),
    fullDescription: z.string().nullable(),
    deploymentUrl: z.url().nullable(),
    createdAt: dateSchema,
    updatedAt: dateSchema,
    repository: z.strictObject({
      id: z.string().uuid(),
      githubRepoId: z.string(),
      fullName: z.string(),
      ownerLogin: z.string(),
      repoName: z.string(),
      htmlUrl: z.url(),
      defaultBranch: z.string().nullable(),
      visibility: z.literal('PUBLIC'),
      lastPushedAt: dateSchema.nullable(),
      lastSyncedAt: dateSchema,
    }),
    technologies: z.array(
      z.strictObject({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
        category: githubTechnologyCategorySchema,
        source: z.literal('SCANNER'),
        evidence: z.string().nullable(),
        detectedAt: dateSchema,
      }),
    ),
  }),
});

export type ImportGithubProjectResponse = z.infer<
  typeof importGithubProjectResponseSchema
>;

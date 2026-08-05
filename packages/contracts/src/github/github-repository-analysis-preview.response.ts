import { z } from 'zod';
import { githubRepositoryPreviewResponseSchema } from './github-repository-preview.response';

export const githubTechnologyCategories = [
  'LANGUAGE',
  'FRAMEWORK',
  'LIBRARY',
  'DATABASE',
  'CLOUD',
  'DEVOPS',
  'TOOL',
  'OTHER',
] as const;

export const githubDetectionSignals = [
  'github-language',
  'package-json',
  'dockerfile',
  'docker-compose',
  'prisma-schema',
  'github-actions',
] as const;

export const githubTechnologyCategorySchema = z.enum(
  githubTechnologyCategories,
);

export const githubDetectionSignalSchema = z.enum(githubDetectionSignals);

export const githubDetectedTechnologySchema = z.strictObject({
  name: z.string(),
  slug: z.string(),
  category: githubTechnologyCategorySchema,
  evidence: z.array(z.string()),
  sourceFiles: z.array(z.string()),
  signals: z.array(githubDetectionSignalSchema),
});

export const githubRepositoryAnalysisPreviewResponseSchema =
  githubRepositoryPreviewResponseSchema.extend({
    detectedTechnologies: z.array(githubDetectedTechnologySchema),
    inspectedFiles: z.array(z.string()),
    missingOptionalFiles: z.array(z.string()),
    aiPitch: z
      .object({
        title: z.string(),
        shortDescription: z.string(),
        fullDescription: z.string(),
      })
      .nullable()
      .optional(),
  });

export type GithubRepositoryAnalysisPreviewResponse = z.infer<
  typeof githubRepositoryAnalysisPreviewResponseSchema
>;

export type GithubDetectedTechnology = z.infer<
  typeof githubDetectedTechnologySchema
>;
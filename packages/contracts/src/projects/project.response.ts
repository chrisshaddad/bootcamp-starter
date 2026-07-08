import { z } from 'zod';
import { dateSchema } from '../common';

export const projectResponseSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  createdByUserId: z.string(),
  title: z.string(),
  slug: z.string(),
  shortDescription: z.string().nullable(),
  fullDescription: z.string().nullable(),
  deploymentUrl: z.string().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  publishedAt: dateSchema.nullable(),
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;

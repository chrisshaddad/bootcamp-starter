import { z } from 'zod';
import { dateSchema } from '../common';
import { projectStatusSchema } from './project-status.schema';

export const publicProjectResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  shortDescription: z.string().nullable(),
  fullDescription: z.string().nullable(),
  deploymentUrl: z.string().nullable(),
  status: projectStatusSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  publishedAt: dateSchema.nullable(),
});

export type PublicProjectResponse = z.infer<typeof publicProjectResponseSchema>;

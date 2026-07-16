import { z } from 'zod';
import { projectResponseSchema } from './project.response';
import { technologySchema } from '../technologies/technology.schema';

export const projectMediaResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  uploadedByUserId: z.string().uuid(),
  mediaType: z.enum(['IMAGE', 'GIF', 'ARCHITECTURE_DIAGRAM']),
  storageKey: z.string(),
  publicUrl: z.string().url(),
  caption: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectMediaResponse = z.infer<typeof projectMediaResponseSchema>;

export const projectTechnologyResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  technologyId: z.string().uuid(),
  source: z.enum(['SCANNER', 'MANUAL', 'BOTH']),
  evidence: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  technology: technologySchema,
});

export type ProjectTechnologyResponse = z.infer<
  typeof projectTechnologyResponseSchema
>;

export const projectByIdResponseSchema = projectResponseSchema.extend({
  media: z.array(projectMediaResponseSchema),
  technologies: z.array(projectTechnologyResponseSchema).default([]),
});

export type ProjectByIdResponse = z.infer<typeof projectByIdResponseSchema>;

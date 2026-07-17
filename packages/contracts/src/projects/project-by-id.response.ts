import { z } from 'zod';
import { projectResponseSchema } from './project.response';
import { projectTechnologyResponseSchema } from './project-technology.response';

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

export const projectByIdResponseSchema = projectResponseSchema.extend({
  repositoryUrl: z.string().url(),
  media: z.array(projectMediaResponseSchema),
  technologies: z.array(projectTechnologyResponseSchema).default([]),
});

export type ProjectByIdResponse = z.infer<typeof projectByIdResponseSchema>;

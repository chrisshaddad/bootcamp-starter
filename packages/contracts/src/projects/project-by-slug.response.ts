import { z } from 'zod';
import { projectResponseSchema } from './project.response';

export const publicProjectMediaResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  mediaType: z.enum(['IMAGE', 'GIF', 'ARCHITECTURE_DIAGRAM']),
  publicUrl: z.string().url(),
  caption: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PublicProjectMediaResponse = z.infer<
  typeof publicProjectMediaResponseSchema
>;

export const projectBySlugResponseSchema = projectResponseSchema.extend({
  media: z.array(publicProjectMediaResponseSchema),
});

export type ProjectBySlugResponse = z.infer<typeof projectBySlugResponseSchema>;

import { z } from 'zod';
export const updateProjectRequestSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().nullable().optional(),
  fullDescription: z.string().nullable().optional(),
  deploymentUrl: z.string().url().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  technologies: z.array(z.object({ id: z.string().uuid() })).optional(), // Added atomic tech array
});
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

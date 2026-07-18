import { z } from 'zod';
import { projectStatusSchema } from './project-status.schema';
export const createProjectRequestSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  deploymentUrl: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .optional(),
  status: projectStatusSchema.optional(),
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

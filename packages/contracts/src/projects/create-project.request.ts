// packages/contracts/src/projects/create-project.request.ts
import { z } from 'zod';

export const createProjectRequestSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),

  // FIX: Apply the same robust structure here
  deploymentUrl: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .optional(), // <-- ADD THIS TO THE END OF THE CHAIN

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

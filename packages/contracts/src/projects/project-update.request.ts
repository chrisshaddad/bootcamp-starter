// packages/contracts/src/projects/update-project.request.ts
import { z } from 'zod';

export const updateProjectRequestSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  slug: z.string().min(1, 'Slug cannot be empty').optional(),
  logoUrl: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .optional(),
  shortDescription: z.string().optional().nullable(),
  fullDescription: z.string().optional().nullable(),

  deploymentUrl: z
    .string()
    .url('Invalid URL')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .optional(),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

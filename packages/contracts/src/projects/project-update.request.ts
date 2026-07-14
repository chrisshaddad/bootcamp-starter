// packages/contracts/src/projects/update-project.request.ts
import { z } from 'zod';

export const updateProjectRequestSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  slug: z.string().min(1, 'Slug cannot be empty').optional(),
  shortDescription: z.string().optional().nullable(),
  fullDescription: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(), // <--- MAKE SURE THIS IS PRESENT

  // FIX: Union allows valid URLs or empty strings, transform sanitizes, and .optional() restores the key optionality
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

export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

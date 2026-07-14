import { z } from 'zod';
export const updateProjectRequestSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  slug: z.string().min(1, 'Slug cannot be empty').optional(),
  shortDescription: z.string().optional().nullable(),
  fullDescription: z.string().optional().nullable(),
  logoUrl: z.literal(null).optional(),
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

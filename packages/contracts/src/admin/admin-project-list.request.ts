import { z } from 'zod';
import { projectStatusSchema } from '../projects';

export const adminProjectListQuerySchema = z.strictObject({
  search: z.string().trim().max(200).optional(),
  status: projectStatusSchema.optional(),
  moderated: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminProjectListQuery = z.infer<typeof adminProjectListQuerySchema>;

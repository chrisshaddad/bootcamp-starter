import { z } from 'zod';
import { adminProjectResponseSchema } from './admin-project.response';

export const adminProjectListResponseSchema = z.strictObject({
  data: z.array(adminProjectResponseSchema),
  meta: z.strictObject({
    totalItems: z.number().int().nonnegative(),
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type AdminProjectListResponse = z.infer<
  typeof adminProjectListResponseSchema
>;

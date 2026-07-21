import { z } from 'zod';
import { adminAccountResponseSchema } from './admin-account.response';

export const adminAccountListResponseSchema = z.strictObject({
  data: z.array(adminAccountResponseSchema),
  meta: z.strictObject({
    totalItems: z.number().int().nonnegative(),
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type AdminAccountListResponse = z.infer<
  typeof adminAccountListResponseSchema
>;

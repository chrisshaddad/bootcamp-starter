import { z } from 'zod';
import { adminAuditLogResponseSchema } from './admin-audit-log.response';

export const adminAuditLogListResponseSchema = z.strictObject({
  data: z.array(adminAuditLogResponseSchema),
  meta: z.strictObject({
    totalItems: z.number().int().nonnegative(),
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type AdminAuditLogListResponse = z.infer<
  typeof adminAuditLogListResponseSchema
>;

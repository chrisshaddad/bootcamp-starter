import { z } from 'zod';
import { adminAuditActionSchema } from './admin-audit-action.schema';
import { adminAuditTargetTypeSchema } from './admin-audit-target-type.schema';

export const adminAuditLogListQuerySchema = z.strictObject({
  action: adminAuditActionSchema.optional(),
  targetType: adminAuditTargetTypeSchema.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminAuditLogListQuery = z.infer<
  typeof adminAuditLogListQuerySchema
>;

import { z } from 'zod';
import { dateSchema, uuidSchema } from '../common';
import { adminAuditActionSchema } from './admin-audit-action.schema';
import { adminAuditTargetTypeSchema } from './admin-audit-target-type.schema';

export const adminAuditLogResponseSchema = z.strictObject({
  id: uuidSchema,
  action: adminAuditActionSchema,
  targetType: adminAuditTargetTypeSchema,
  targetId: uuidSchema,
  reason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: dateSchema,
  actor: z
    .strictObject({
      id: uuidSchema,
      email: z.string().email(),
      displayName: z.string(),
    })
    .nullable(),
});

export type AdminAuditLogResponse = z.infer<typeof adminAuditLogResponseSchema>;

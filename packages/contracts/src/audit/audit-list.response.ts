import { z } from 'zod';
import { dateSchema } from '../common';

// A single row in the super-admin audit log table. The actor fields are
// nullable because `AuditLog.userId` is a soft ref (onDelete: SetNull) — a log
// entry outlives the user who created it. `details` is the raw JSON payload
// recorded with the action; its shape is action-specific, so it stays `unknown`
// and is rendered as raw JSON in the row detail view.
export const auditLogItemSchema = z.object({
  id: z.uuid(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  details: z.unknown().nullable(),
  createdAt: dateSchema,
  userId: z.uuid().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});
export type AuditLogItem = z.infer<typeof auditLogItemSchema>;

// Response from GET /audit (optionally filtered by ?action=, ?entity=, ?userId=).
export const auditListResponseSchema = z.object({
  logs: z.array(auditLogItemSchema),
  total: z.number(),
});
export type AuditListResponse = z.infer<typeof auditListResponseSchema>;

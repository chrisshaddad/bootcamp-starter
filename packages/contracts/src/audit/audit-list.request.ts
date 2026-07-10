import { z } from 'zod';

// Query params for GET /audit. All filters are optional; omitting them returns
// every log entry. `action`/`entity` are free-form strings on the model (not
// enums), so they're validated only as non-empty strings. `userId` narrows the
// feed to a single actor. Unknown/empty values are rejected before the query.
export const auditListQuerySchema = z.object({
  action: z.string().min(1).optional(),
  entity: z.string().min(1).optional(),
  userId: z.uuid().optional(),
});
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

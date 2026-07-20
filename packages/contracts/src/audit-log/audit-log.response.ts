import { z } from 'zod';

export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  userName: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  entityName: z.string().nullable(),
  metadata: z.any().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

export const auditLogListResponseSchema = z.object({
  data: z.array(auditLogResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;

import { z } from 'zod';

export const adminAuditActionSchema = z.enum([
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_REACTIVATED',
  'PROJECT_ARCHIVED',
  'PROJECT_SUSPENDED',
  'PROJECT_RESTORED',
]);

export type AdminAuditAction = z.infer<typeof adminAuditActionSchema>;

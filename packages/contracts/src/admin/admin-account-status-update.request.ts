import { z } from 'zod';
import { adminAccountStatusSchema } from './admin-account-status.schema';

export const adminAccountStatusUpdateSchema = z.strictObject({
  status: adminAccountStatusSchema,
  reason: z.string().trim().min(10).max(1000),
});

export type AdminAccountStatusUpdate = z.infer<
  typeof adminAccountStatusUpdateSchema
>;

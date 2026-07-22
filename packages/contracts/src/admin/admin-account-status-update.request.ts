import { z } from 'zod';

export const adminAccountStatusUpdateSchema = z.strictObject({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().min(10).max(1000),
});

export type AdminAccountStatusUpdate = z.infer<
  typeof adminAccountStatusUpdateSchema
>;

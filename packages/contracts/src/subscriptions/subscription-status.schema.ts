import { z } from 'zod';

export const subscriptionStatusSchema = z.enum([
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

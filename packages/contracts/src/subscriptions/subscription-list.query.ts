import { z } from 'zod';
import { subscriptionStatusSchema } from './subscription-status.schema';

export const subscriptionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: subscriptionStatusSchema.optional(),
});
export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;

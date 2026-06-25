import { z } from 'zod';
import { subscriptionResponseSchema } from './subscription.response';

export const subscriptionListResponseSchema = z.object({
  subscriptions: z.array(subscriptionResponseSchema),
  total: z.number().int().nonnegative(),
});
export type SubscriptionListResponse = z.infer<
  typeof subscriptionListResponseSchema
>;

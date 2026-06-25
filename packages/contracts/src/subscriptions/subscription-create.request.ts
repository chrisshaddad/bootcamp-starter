import { z } from 'zod';

export const subscriptionCreateRequestSchema = z.object({
  memberId: z.string().uuid('Member ID must be a valid UUID'),
  planId: z.string().uuid('Plan ID must be a valid UUID'),
});
export type SubscriptionCreateRequest = z.infer<
  typeof subscriptionCreateRequestSchema
>;

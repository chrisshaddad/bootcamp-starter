import { z } from 'zod';

export const subscriptionCreateRequestSchema = z.object({
  memberId: z.uuid(),
  planId: z.uuid(),
});
export type SubscriptionCreateRequest = z.infer<
  typeof subscriptionCreateRequestSchema
>;

import { z } from 'zod';
import { dateSchema } from '../common';
import { subscriptionStatusSchema } from './subscription-status.schema';

export const subscriptionResponseSchema = z.object({
  id: z.uuid(),
  gymId: z.uuid(),
  memberId: z.uuid(),
  planId: z.uuid().nullable(),
  startDate: dateSchema,
  endDate: dateSchema,
  price: z.number().int().nonnegative(),
  status: subscriptionStatusSchema,
  plan: z
    .object({
      id: z.uuid(),
      name: z.string(),
      durationDays: z.number().int().positive(),
      isActive: z.boolean(),
    })
    .nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

import { z } from 'zod';
import { dateSchema } from '../common';

export const planResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  durationDays: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type PlanResponse = z.infer<typeof planResponseSchema>;

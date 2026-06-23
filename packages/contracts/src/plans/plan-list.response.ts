import { z } from 'zod';
import { planResponseSchema } from './plan.response';

export const planListResponseSchema = z.object({
  plans: z.array(planResponseSchema),
  total: z.number().int().nonnegative(),
});
export type PlanListResponse = z.infer<typeof planListResponseSchema>;

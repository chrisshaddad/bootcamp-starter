import { z } from 'zod';

export const planListQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PlanListQuery = z.infer<typeof planListQuerySchema>;

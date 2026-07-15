import { z } from 'zod';
import { opportunityStatusSchema } from './opportunity-status.schema';

export const opportunityListQuerySchema = z.object({
  status: opportunityStatusSchema.optional(),
  mine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type OpportunityListQuery = z.infer<typeof opportunityListQuerySchema>;

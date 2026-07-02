import { z } from 'zod';
import { opportunityResponseSchema } from './opportunity.response';

export const opportunityListResponseSchema = z.object({
  opportunities: z.array(opportunityResponseSchema),
  total: z.number(),
});
export type OpportunityListResponse = z.infer<
  typeof opportunityListResponseSchema
>;

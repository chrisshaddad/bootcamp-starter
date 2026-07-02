import { z } from 'zod';

export const opportunityStatusSchema = z.enum(['OPEN', 'CLOSED', 'FILLED']);
export type OpportunityStatus = z.infer<typeof opportunityStatusSchema>;

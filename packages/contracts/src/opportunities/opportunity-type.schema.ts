import { z } from 'zod';

export const opportunityTypeSchema = z.enum(['ROLE', 'PROJECT', 'ROTATION']);
export type OpportunityType = z.infer<typeof opportunityTypeSchema>;

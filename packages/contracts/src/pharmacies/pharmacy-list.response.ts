import { z } from 'zod';
import { pharmacyOptionSchema } from './pharmacy-option.schema';

// Response from GET /pharmacies.
export const pharmacyListResponseSchema = z.object({
  pharmacies: z.array(pharmacyOptionSchema),
});
export type PharmacyListResponse = z.infer<typeof pharmacyListResponseSchema>;

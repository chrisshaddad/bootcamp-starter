import { z } from 'zod';

// A pharmacy as shown in selection dropdowns (e.g. assigning a pharmacy user).
export const pharmacyOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type PharmacyOption = z.infer<typeof pharmacyOptionSchema>;

// Response from GET /pharmacies.
export const pharmacyListResponseSchema = z.object({
  pharmacies: z.array(pharmacyOptionSchema),
});
export type PharmacyListResponse = z.infer<typeof pharmacyListResponseSchema>;

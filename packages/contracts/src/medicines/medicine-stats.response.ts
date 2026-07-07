import { z } from 'zod';

// Aggregate counts for the catalog summary cards. Computed across the whole
// catalog (not just the current page), so the cards are always accurate.
export const medicineStatsResponseSchema = z.object({
  total: z.number(),
  priced: z.number(),
  withBarcode: z.number(),
});
export type MedicineStatsResponse = z.infer<typeof medicineStatsResponseSchema>;

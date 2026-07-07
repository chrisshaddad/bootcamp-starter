import { z } from 'zod';
import { medicineResponseSchema } from './medicine.response';

// Response from GET /medicines. Carries the current page slice plus the total
// count and the echoed page/pageSize so the client can render pagination.
export const medicineListResponseSchema = z.object({
  medicines: z.array(medicineResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type MedicineListResponse = z.infer<typeof medicineListResponseSchema>;

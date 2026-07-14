import { z } from 'zod';
import { dateSchema } from '../common';

// One medicine currently stocked at a branch, rolled up from its in-stock
// batches. `priceLbp` is the medicine's catalog price (a plain number; the API
// converts Prisma's Decimal), null when unset. Links back to the medicine
// detail (`/find/[medicineId]`) on the client.
export const branchStockedMedicineSchema = z.object({
  medicineId: z.uuid(),
  brandName: z.string(),
  form: z.string().nullable(),
  dosage: z.string().nullable(),
  priceLbp: z.number().nullable(),
  totalQuantity: z.number().int().nonnegative(),
  nearestExpiry: dateSchema.nullable(),
});
export type BranchStockedMedicine = z.infer<typeof branchStockedMedicineSchema>;

// Response for GET /directory/branches/:id — the public branch profile: its
// pharmacy + location + contact, plus the medicines it currently stocks
// (in-stock only, ordered alphabetically by brand name server-side).
export const branchDetailResponseSchema = z.object({
  branchId: z.uuid(),
  pharmacyId: z.uuid(),
  pharmacyName: z.string(),
  branchName: z.string(),
  address: z.string(),
  phoneNumber: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  medicines: z.array(branchStockedMedicineSchema),
});
export type BranchDetailResponse = z.infer<typeof branchDetailResponseSchema>;

import { z } from 'zod';
import { dateSchema } from '../common';

// A single stock batch of one medicine at one branch. `batchNumber` is optional
// (some stock arrives without a printed lot). `expiryDate` is a calendar date
// stored as `@db.Date`; it travels the wire as a date/ISO string.
export const stockBatchResponseSchema = z.object({
  id: z.uuid(),
  branchId: z.uuid(),
  medicineId: z.uuid(),
  batchNumber: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  expiryDate: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type StockBatchResponse = z.infer<typeof stockBatchResponseSchema>;

import { z } from 'zod';
import { dateSchema } from '../common';

// One row in the /stock inventory list: a medicine held at the branch, with its
// batches rolled up. `totalQuantity` sums every batch; `batchCount` is how many
// batches back it; `nearestExpiry` is the soonest-expiring batch (null only if a
// medicine somehow has no dated batches — normally always present).
export const stockMedicineSummarySchema = z.object({
  medicineId: z.uuid(),
  brandName: z.string(),
  form: z.string().nullable(),
  dosage: z.string().nullable(),
  barcode: z.string().nullable(),
  totalQuantity: z.number().int().nonnegative(),
  batchCount: z.number().int().nonnegative(),
  nearestExpiry: dateSchema.nullable(),
});
export type StockMedicineSummary = z.infer<typeof stockMedicineSummarySchema>;

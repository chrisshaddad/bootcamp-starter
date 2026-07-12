import { z } from 'zod';
import { stockCatalogItemSchema } from './stock-catalog.response';
import { stockBatchResponseSchema } from './stock-batch.response';

// Response from GET /stock/medicines/:medicineId — every batch of one medicine
// at the resolved branch, with the medicine's catalog info and the recomputed
// total. `branchName` labels which branch's batches these are.
export const stockMedicineDetailResponseSchema = z.object({
  branchId: z.uuid(),
  branchName: z.string(),
  medicine: stockCatalogItemSchema,
  totalQuantity: z.number().int().nonnegative(),
  batches: z.array(stockBatchResponseSchema),
});
export type StockMedicineDetailResponse = z.infer<
  typeof stockMedicineDetailResponseSchema
>;

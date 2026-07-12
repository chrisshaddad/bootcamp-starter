import { z } from 'zod';
import { stockMedicineSummarySchema } from './stock-medicine-summary.response';

// Response from GET /stock. `branchId`/`branchName` echo the branch the server
// resolved for the caller (a stock manager's own branch, or the admin's chosen /
// default branch) so the UI can label the view and pre-select the picker. Both
// are null when a pharmacy admin has no branches yet.
export const stockListResponseSchema = z.object({
  branchId: z.uuid().nullable(),
  branchName: z.string().nullable(),
  medicines: z.array(stockMedicineSummarySchema),
  total: z.number(),
});
export type StockListResponse = z.infer<typeof stockListResponseSchema>;

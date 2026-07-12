import { z } from 'zod';
import { stockBranchScopeQuerySchema } from './stock-branch-scope.request';

// Query params for GET /stock — the per-branch medicine inventory summary.
// `search` matches medicine brand name / barcode. Low-quantity and near-expiry
// flags are derived client-side from the returned totals, so they aren't params.
export const stockListQuerySchema = stockBranchScopeQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
});
export type StockListQuery = z.infer<typeof stockListQuerySchema>;

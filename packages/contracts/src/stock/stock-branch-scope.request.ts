import { z } from 'zod';

// Optional branch selector shared by the stock read endpoints. A STOCK_MANAGER
// is always pinned to their own branch server-side, so this is ignored for them;
// a PHARMACY_ADMIN uses it to pick which branch's stock to view (defaulting to
// their first branch when omitted). The server always re-checks that the branch
// belongs to the caller's pharmacy — never trust this value for a write.
export const stockBranchScopeQuerySchema = z.object({
  branchId: z.uuid().optional(),
});
export type StockBranchScopeQuery = z.infer<typeof stockBranchScopeQuerySchema>;

import { z } from 'zod';

// Query params for GET /stock/catalog — the medicine picker behind "add batch".
// Pass `barcode` for an exact scan lookup (found → reuse, empty → offer to
// create), or `search` for a free-text name/barcode match. At least one is
// expected; with neither, the endpoint returns nothing.
export const stockCatalogQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  barcode: z.string().trim().max(100).optional(),
});
export type StockCatalogQuery = z.infer<typeof stockCatalogQuerySchema>;

import { z } from 'zod';

// A lightweight medicine catalog entry for the add-batch picker and barcode
// lookup. The global catalog carries far more (ingredients, MOPH id) — stock
// only needs enough to identify and label a medicine, plus its price (LBP) so
// the inventory views can show it. `priceLbp` is a plain number on the wire (the
// API converts Prisma's Decimal); null when the medicine has no price set.
export const stockCatalogItemSchema = z.object({
  id: z.uuid(),
  brandName: z.string(),
  form: z.string().nullable(),
  dosage: z.string().nullable(),
  barcode: z.string().nullable(),
  priceLbp: z.number().nullable(),
});
export type StockCatalogItem = z.infer<typeof stockCatalogItemSchema>;

// Response from GET /stock/catalog — matches for the search box / barcode scan.
export const stockCatalogResponseSchema = z.object({
  medicines: z.array(stockCatalogItemSchema),
});
export type StockCatalogResponse = z.infer<typeof stockCatalogResponseSchema>;

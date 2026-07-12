import { z } from 'zod';

// Response from GET /stock/attributes — distinct medicine attribute values
// already in the catalog, powering the "pick existing or type new" comboboxes on
// the add-medicine (barcode-not-found) form. Kept lightweight so the add-batch
// dialog can prefetch it without touching the heavier catalog search.
export const stockAttributesResponseSchema = z.object({
  forms: z.array(z.string()),
  dosages: z.array(z.string()),
  types: z.array(z.string()),
  ingredients: z.array(z.string()),
});
export type StockAttributesResponse = z.infer<
  typeof stockAttributesResponseSchema
>;

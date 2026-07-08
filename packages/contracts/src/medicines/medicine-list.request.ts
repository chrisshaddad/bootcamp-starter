import { z } from 'zod';

// Boolean-ish query params arrive as the strings "true"/"false"; keep them as a
// string enum on the wire and let the API interpret them.
const boolParam = z.enum(['true', 'false']).optional();

// Shared filter shape for the catalog. Used both by the paginated list and by
// the facets endpoint that powers the cascading filter dropdowns. `search`
// matches brand name, barcode, and ingredients.
export const medicineFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  type: z.string().trim().max(20).optional(),
  form: z.string().trim().max(50).optional(),
  dosage: z.string().trim().max(100).optional(),
  hasPrice: boolParam,
  hasBarcode: boolParam,
});
export type MedicineFilter = z.infer<typeof medicineFilterSchema>;

// Query params for GET /medicines. The catalog is large (the MOPH workbook
// seeds thousands of rows), so listing is paginated and filtered server-side.
export const medicineListQuerySchema = medicineFilterSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type MedicineListQuery = z.infer<typeof medicineListQuerySchema>;

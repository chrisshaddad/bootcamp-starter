import { z } from 'zod';
import { medicineResponseSchema } from './medicine.response';

// Response from GET /medicines. Carries the current page slice plus the total
// count and the echoed page/pageSize so the client can render pagination.
export const medicineListResponseSchema = z.object({
  medicines: z.array(medicineResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type MedicineListResponse = z.infer<typeof medicineListResponseSchema>;

// Response from GET /medicines/facets — the available filter values given the
// currently-applied filters. Each list is computed while ignoring its own
// dimension, so the dropdowns cascade: picking a form narrows the dosages (and
// types) to what's compatible.
export const medicineFacetsResponseSchema = z.object({
  types: z.array(z.string()),
  forms: z.array(z.string()),
  dosages: z.array(z.string()),
});
export type MedicineFacetsResponse = z.infer<
  typeof medicineFacetsResponseSchema
>;

// Response from GET /medicines/ingredients — the distinct free-text ingredient
// strings already in the catalog, used to power the creatable combobox in the
// add/edit form. Kept separate from the facets endpoint so the (heavier)
// distinct-ingredients scan never slows the cascading table filters.
export const medicineIngredientOptionsResponseSchema = z.object({
  ingredients: z.array(z.string()),
});
export type MedicineIngredientOptionsResponse = z.infer<
  typeof medicineIngredientOptionsResponseSchema
>;

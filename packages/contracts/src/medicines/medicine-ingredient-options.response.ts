import { z } from 'zod';

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

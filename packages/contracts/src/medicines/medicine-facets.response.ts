import { z } from 'zod';

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

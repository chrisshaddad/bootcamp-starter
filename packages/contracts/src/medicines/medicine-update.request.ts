import { z } from 'zod';
import { medicineCreateRequestSchema } from './medicine-create.request';

// Body for PATCH /medicines/:id. Every field from the create shape is optional
// so a caller can change a single value (e.g. fix a price or barcode); at least
// one field must be present. The edit form still submits the full object, which
// this partial shape happily accepts.
//
// `ingredients` is intentionally omitted: they're set only when a medicine is
// first created (the shared catalog is the source of truth for an existing
// medicine), so they can't be changed on update. Any `ingredients` sent by a
// client is silently stripped by this schema rather than rejected.
export const medicineUpdateRequestSchema = medicineCreateRequestSchema
  .omit({ ingredients: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
export type MedicineUpdateRequest = z.infer<typeof medicineUpdateRequestSchema>;

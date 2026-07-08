import { z } from 'zod';
import { medicineCreateRequestSchema } from './medicine-create.request';

// Body for PATCH /medicines/:id. Every field from the create shape is optional
// so a caller can change a single value (e.g. fix a price or barcode); at least
// one field must be present. The edit form still submits the full object, which
// this partial shape happily accepts.
export const medicineUpdateRequestSchema = medicineCreateRequestSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
export type MedicineUpdateRequest = z.infer<typeof medicineUpdateRequestSchema>;

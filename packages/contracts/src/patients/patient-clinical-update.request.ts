import { z } from 'zod';
import { bloodTypeSchema } from './blood-type.schema';

// Request for PATCH /patients/:id/clinical — the clinical summary layer.
// Editable by the assigned Professional / Institution Admin.
export const patientClinicalUpdateRequestSchema = z.object({
  bloodType: bloodTypeSchema.nullable().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  clinicalNotes: z.string().nullable().optional(),
});
export type PatientClinicalUpdateRequest = z.infer<
  typeof patientClinicalUpdateRequestSchema
>;

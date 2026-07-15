import { z } from 'zod';
import { genderSchema } from './gender.schema';

// Request for POST /patients — Staff/Admin registers a patient. Creates the
// User (role PATIENT) + Patient profile. Only identity fields are required;
// the rest of the administrative layer can be filled in later.
export const patientCreateRequestSchema = z.object({
  fullName: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
  dateOfBirth: z.string().optional(), // ISO date (YYYY-MM-DD)
  gender: genderSchema.optional(),
  nationalId: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
});
export type PatientCreateRequest = z.infer<typeof patientCreateRequestSchema>;

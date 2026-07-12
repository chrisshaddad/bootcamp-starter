import { z } from 'zod';
import { genderSchema } from './gender.schema';

// Request for PATCH /patients/:id/admin — the administrative layer.
// Editable by Staff / Institution Admin. fullName/phone live on the User row;
// the rest on the Patient row.
export const patientAdminUpdateRequestSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: genderSchema.nullable().optional(),
  nationalId: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  emergencyContactRelationship: z.string().nullable().optional(),
});
export type PatientAdminUpdateRequest = z.infer<
  typeof patientAdminUpdateRequestSchema
>;

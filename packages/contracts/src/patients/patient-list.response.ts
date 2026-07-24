import { z } from 'zod';
import { genderSchema } from './gender.schema';
import { dateSchema } from '../common';

export const patientListItemSchema = z.object({
  id: z.uuid(), // Patient id (not User id)
  userId: z.uuid(),
  fullName: z.string(),
  email: z.email(),
  phone: z.string(),
  gender: genderSchema.nullable(),
  dateOfBirth: dateSchema.nullable(),
  nationalId: z.string().nullable(),
  isActive: z.boolean(),
  isConfirmed: z.boolean(),
  createdAt: dateSchema,
});
export type PatientListItem = z.infer<typeof patientListItemSchema>;

// Response from GET /patients
export const patientListResponseSchema = z.object({
  patients: z.array(patientListItemSchema),
  total: z.number(),
});
export type PatientListResponse = z.infer<typeof patientListResponseSchema>;

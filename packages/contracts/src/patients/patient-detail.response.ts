import { z } from 'zod';
import { genderSchema } from './gender.schema';
import { bloodTypeSchema } from './blood-type.schema';
import { dateSchema } from '../common';

// A member of the patient's active care team (shown on detail + portal).
export const careTeamMemberSchema = z.object({
  assignmentId: z.uuid(),
  professionalId: z.uuid(),
  fullName: z.string(),
  specialty: z.string().nullable(),
  bio: z.string().nullable(),
  phone: z.string(),
  email: z.email(),
});
export type CareTeamMember = z.infer<typeof careTeamMemberSchema>;

// Response from GET /patients/:id and GET /patients/me
export const patientDetailResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  institutionId: z.uuid(),

  // User identity
  fullName: z.string(),
  email: z.email(),
  phone: z.string(),
  isActive: z.boolean(),
  isConfirmed: z.boolean(),

  // Administrative layer
  dateOfBirth: dateSchema.nullable(),
  gender: genderSchema.nullable(),
  nationalId: z.string().nullable(),
  address: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  emergencyContactRelationship: z.string().nullable(),

  // Clinical summary layer
  bloodType: bloodTypeSchema.nullable(),
  allergies: z.array(z.string()),
  chronicConditions: z.array(z.string()),
  clinicalNotes: z.string().nullable(),

  careTeam: z.array(careTeamMemberSchema),

  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type PatientDetailResponse = z.infer<typeof patientDetailResponseSchema>;

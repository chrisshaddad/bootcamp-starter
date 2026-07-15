import { z } from 'zod';
import { institutionTypeSchema } from './institution-type.schema';

// Request for PATCH /institutions/me — an Institution Admin edits their own
// institution profile. All fields optional (partial update).
export const institutionUpdateRequestSchema = z.object({
  name: z.string().min(1).optional(),
  type: institutionTypeSchema.optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  emailNotifications: z.boolean().optional(),
});
export type InstitutionUpdateRequest = z.infer<
  typeof institutionUpdateRequestSchema
>;

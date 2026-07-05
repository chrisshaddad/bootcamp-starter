import { z } from 'zod';
import { institutionTypeSchema } from './institution-type.schema';

// An institution with no admin user has no one who can log in to manage it,
// so creation requires both the institution and its first admin at once.
const institutionAdminSchema = z.object({
  email: z.email(),
  fullName: z.string().min(1),
  phone: z.string().min(1),
});

// Request for POST /institutions
export const institutionCreateRequestSchema = z.object({
  name: z.string().min(1),
  type: institutionTypeSchema,
  address: z.string().nullable().optional(),
  admin: institutionAdminSchema,
});
export type InstitutionCreateRequest = z.infer<
  typeof institutionCreateRequestSchema
>;

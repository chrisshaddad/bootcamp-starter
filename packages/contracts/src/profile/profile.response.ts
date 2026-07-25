import { z } from 'zod';
import { dateSchema } from '../common';
import { userRoleSchema } from '../users/user-role.schema';

// The caller's own account + profile (GET /profile). Profile fields are
// flattened (rather than nested) for a simpler settings form; they're null when
// no UserProfile row exists yet.
export const profileResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  role: userRoleSchema,
  phoneNumber: z.string().nullable(),
  bio: z.string().nullable(),
  dateOfBirth: dateSchema.nullable(),
  street1: z.string().nullable(),
  street2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
});
export type ProfileResponse = z.infer<typeof profileResponseSchema>;

import { z } from 'zod';
import { userRoleSchema } from '../users/user-role.schema';
import { userStatusSchema } from '../users/user-status.schema';
import { dateSchema } from '../common';

// The signed-in user's own profile (GET /profile). `latitude`/`longitude` are
// stored as DB decimals but travel the wire as plain numbers (the API converts
// them); `dateOfBirth` travels as a 'YYYY-MM-DD' string. `email`, `role`, and
// `status` are shown read-only — they are not editable from the profile page.
export const profileResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string().nullable(),
  dateOfBirth: dateSchema.nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  role: userRoleSchema,
  status: userStatusSchema,
});
export type ProfileResponse = z.infer<typeof profileResponseSchema>;

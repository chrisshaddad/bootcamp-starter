import { z } from 'zod';

// Response from GET /profile/me — every role's own basic account info,
// plus the professional-only fields (specialty/bio) when applicable.
export const selfProfileResponseSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.email(),
  phone: z.string(),
  role: z.enum([
    'SUPER_ADMIN',
    'INSTITUTION_ADMIN',
    'STAFF',
    'PROFESSIONAL',
    'PATIENT',
  ]),
  institutionName: z.string(),
  // Professional-only; null for every other role.
  specialty: z.string().nullable(),
  bio: z.string().nullable(),
});
export type SelfProfileResponse = z.infer<typeof selfProfileResponseSchema>;

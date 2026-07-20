import { z } from 'zod';

// Request body for PATCH /profile/me. Deliberately narrower than the
// admin-facing user-update contract: every role may update their own
// fullName/phone, and a PROFESSIONAL may additionally update their own
// bio — but never their own specialty or email, which stay admin-controlled.
export const selfProfileUpdateRequestSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
});
export type SelfProfileUpdateRequest = z.infer<
  typeof selfProfileUpdateRequestSchema
>;

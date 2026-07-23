import { z } from 'zod';

// PATCH /profile — the caller updates their own account + profile. Every field
// is optional; a provided value (including empty string) is applied, omitted
// keys are left unchanged.
export const profileUpdateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200).optional(),
  phoneNumber: z.string().max(50).nullish(),
  bio: z.string().max(2000).nullish(),
  // yyyy-mm-dd (or empty to clear); the service converts to a Date.
  dateOfBirth: z.string().nullish(),
  street1: z.string().max(200).nullish(),
  street2: z.string().max(200).nullish(),
  city: z.string().max(120).nullish(),
  state: z.string().max(120).nullish(),
  postalCode: z.string().max(20).nullish(),
  country: z.string().max(120).nullish(),
  profilePictureUrl: z.string().nullish(),
});
export type ProfileUpdateRequest = z.infer<typeof profileUpdateRequestSchema>;

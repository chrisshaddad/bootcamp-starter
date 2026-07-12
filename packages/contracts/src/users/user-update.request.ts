import { z } from 'zod';

// Request for PATCH /users/:id — edit profile fields. specialty/bio only
// apply to professionals and are ignored for staff.
export const userUpdateRequestSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  specialty: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
});
export type UserUpdateRequest = z.infer<typeof userUpdateRequestSchema>;

import { z } from 'zod';

// Body for PATCH /profile — the signed-in user editing their own details.
// `email`, `role`, and `status` are intentionally absent (not self-editable).
// Optional fields are nullable so an emptied input clears the stored value.
// Coordinates arrive as plain numbers and dateOfBirth as a 'YYYY-MM-DD' string;
// the web form maps its string inputs to this shape before sending.
export const profileUpdateRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phoneNumber: z.string().trim().max(20).nullable(),
  dateOfBirth: z.iso.date().nullable(),
  address: z.string().trim().max(1000).nullable(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .nullable(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .nullable(),
});
export type ProfileUpdateRequest = z.infer<typeof profileUpdateRequestSchema>;

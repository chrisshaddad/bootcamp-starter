import { z } from 'zod';

// Request for POST /auth/signup — CLIENT self-registration only.
// The server forces role = CLIENT and status = ACTIVE; the client cannot
// choose a role here. A magic link is emailed to verify the address.
export const signupRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phoneNumber: z.string().trim().max(20).optional(),
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

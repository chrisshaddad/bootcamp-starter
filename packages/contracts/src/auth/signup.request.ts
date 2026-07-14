import { z } from 'zod';

// Request for POST /auth/signup — CLIENT self-registration only.
// The server forces role = CLIENT and status = ACTIVE; the client cannot choose
// a role here. Registration only creates the account record and signs the
// client in — no password is set here. They log in via magic link and can add a
// password later from their profile to enable password login.
export const signupRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phoneNumber: z.string().trim().max(20).optional(),
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

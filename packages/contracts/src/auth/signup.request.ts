import { z } from 'zod';

// Request for POST /auth/signup — CLIENT self-registration only.
// The server forces role = CLIENT and creates the account with status = PENDING;
// the client cannot choose a role here. Registration only creates the account
// record and emails a magic link — it does not sign the client in. The link
// carries them to the set-password step, after which they can log in.
export const signupRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phoneNumber: z.string().trim().max(20).optional(),
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

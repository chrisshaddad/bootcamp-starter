import { z } from 'zod';

// Request for POST /auth/login (password flow).
// Password is validated for presence only — strength rules are enforced when
// a password is *set*, not when an existing one is checked.
export const passwordLoginRequestSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});
export type PasswordLoginRequest = z.infer<typeof passwordLoginRequestSchema>;

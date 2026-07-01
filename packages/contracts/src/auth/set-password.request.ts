import { z } from 'zod';
import { passwordSchema } from './password.schema';

// Request for POST /auth/set-password (authenticated).
// Used by invited staff to set their first password (PENDING -> ACTIVE) and by
// any user to change their password. Enforces the shared strength rules.
export const setPasswordRequestSchema = z.object({
  password: passwordSchema,
});
export type SetPasswordRequest = z.infer<typeof setPasswordRequestSchema>;

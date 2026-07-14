import { z } from 'zod';

// Response from POST /auth/register. The account is usable immediately (no
// approval gate) - a magic link has already been sent to `email`.
export const patronRegisterResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
});
export type PatronRegisterResponse = z.infer<
  typeof patronRegisterResponseSchema
>;

import { z } from 'zod';

// Request for POST /auth/register (public patron self-signup - not tied to
// any library; joining a specific library is a separate step).
export const patronRegisterRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z.email().transform((email) => email.toLowerCase().trim()),
});
export type PatronRegisterRequest = z.infer<typeof patronRegisterRequestSchema>;

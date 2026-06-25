import { z } from 'zod';

// Request for POST /auth/magic-link
export const magicLinkRequestSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .transform((email) => email.toLowerCase().trim()),
});
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

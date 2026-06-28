import { z } from 'zod';

// Request for POST /auth/magic-link
export const magicLinkRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

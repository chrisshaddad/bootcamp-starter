import { z } from 'zod';

export const registerRequestSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters'),
  name: z.string().min(1, 'Your name is required'),
  email: z.email('Invalid email address'),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

import { z } from 'zod';

export const forgotPasswordRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

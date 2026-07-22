import { z } from 'zod';

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

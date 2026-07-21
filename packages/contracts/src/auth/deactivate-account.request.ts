import { z } from 'zod';

export const deactivateAccountRequestSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type DeactivateAccountRequest = z.infer<
  typeof deactivateAccountRequestSchema
>;

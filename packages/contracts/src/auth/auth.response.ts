import { z } from 'zod';

export const authResponseSchema = z.strictObject({
  user: z.strictObject({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

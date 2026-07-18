import { z } from 'zod';

export const successResponseSchema = z.strictObject({
  success: z.literal(true),
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;

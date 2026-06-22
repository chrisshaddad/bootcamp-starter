import { z } from 'zod';

export const gymReasonRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required')
    .max(500, 'Reason must not exceed 500 characters'),
});
export type GymReasonRequest = z.infer<typeof gymReasonRequestSchema>;

import { z } from 'zod';

export const gymReasonRequestSchema = z.object({
  reason: z
    .string()
    .min(1, 'Reason is required')
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length <= 80, {
      message: 'Reason must not exceed 80 words',
    }),
});
export type GymReasonRequest = z.infer<typeof gymReasonRequestSchema>;

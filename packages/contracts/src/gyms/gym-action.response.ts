import { z } from 'zod';
import { gymDetailResponseSchema } from './gym-detail.response';

// Response from PATCH /gyms/:id/approve or /reject
export const gymActionResponseSchema = z.object({
  message: z.string(),
  gym: gymDetailResponseSchema,
});
export type GymActionResponse = z.infer<typeof gymActionResponseSchema>;

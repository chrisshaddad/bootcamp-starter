import { z } from 'zod';

export const careerPathCreateRequestSchema = z.object({
  targetTitle: z.string().trim().min(3).max(200),
  timeframeMonths: z.union([z.literal(6), z.literal(12), z.literal(24)]),
});
export type CareerPathCreateRequest = z.infer<
  typeof careerPathCreateRequestSchema
>;

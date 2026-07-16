import { z } from 'zod';
import { dateSchema } from '../common';

export const careerPathResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  targetTitle: z.string(),
  timeframeMonths: z.number(),
  milestones: z.unknown(), // JSON — structured by AI later
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type CareerPathResponse = z.infer<typeof careerPathResponseSchema>;

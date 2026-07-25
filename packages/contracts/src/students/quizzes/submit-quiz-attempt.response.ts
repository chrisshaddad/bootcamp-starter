import { z } from 'zod';

export const submitQuizAttemptResponseSchema = z.object({
  id: z.uuid(),
  assignmentId: z.uuid(),
  submittedAt: z.iso.datetime(),
  autoScore: z.number(),
  totalPoints: z.number(),
  status: z.literal('submitted'),
});

export type SubmitQuizAttemptResponse = z.infer<
  typeof submitQuizAttemptResponseSchema
>;

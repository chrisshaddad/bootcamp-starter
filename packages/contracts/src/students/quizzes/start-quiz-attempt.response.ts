import { z } from 'zod';

export const startQuizAttemptResponseSchema = z.object({
  id: z.uuid(),
  assignmentId: z.uuid(),
  startedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  status: z.enum(['in_progress', 'expired']),
});

export type StartQuizAttemptResponse = z.infer<
  typeof startQuizAttemptResponseSchema
>;

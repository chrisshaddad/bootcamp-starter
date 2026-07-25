import { z } from 'zod';

export const submitQuizAnswerSchema = z.object({
  questionId: z.uuid(),
  selectedOptionId: z.uuid(),
});

export const submitQuizAttemptRequestSchema = z
  .object({
    answers: z
      .array(submitQuizAnswerSchema)
      .min(1, 'At least one answer is required'),
  })
  .superRefine((value, context) => {
    const questionIds = value.answers.map((answer) => answer.questionId);

    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['answers'],
        message: 'Each question can only be answered once',
      });
    }
  });

export type SubmitQuizAnswer = z.infer<typeof submitQuizAnswerSchema>;

export type SubmitQuizAttemptRequest = z.infer<
  typeof submitQuizAttemptRequestSchema
>;

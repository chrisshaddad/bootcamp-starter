import { z } from 'zod';

export const gradeSubmissionRequestSchema = z.object({
  score: z.number().min(0, 'Score cannot be negative'),

  feedbackText: z
    .string()
    .trim()
    .max(3000, 'Feedback cannot exceed 3000 characters')
    .optional(),
});

export type GradeSubmissionRequest = z.infer<
  typeof gradeSubmissionRequestSchema
>;

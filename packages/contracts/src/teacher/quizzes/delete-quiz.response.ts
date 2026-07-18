import { z } from 'zod';

export const deleteTeacherQuizResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
});

export type DeleteTeacherQuizResponse = z.infer<
  typeof deleteTeacherQuizResponseSchema
>;

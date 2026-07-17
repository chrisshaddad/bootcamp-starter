import { z } from 'zod';

export const deleteTeacherAssignmentResponseSchema = z.object({
  message: z.string(),
});

export type DeleteTeacherAssignmentResponse = z.infer<
  typeof deleteTeacherAssignmentResponseSchema
>;

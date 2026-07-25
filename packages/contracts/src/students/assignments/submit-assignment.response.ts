import { z } from 'zod';
import { studentAssignmentSubmissionStatusSchema } from './student-assignment-list.response';

export const submitAssignmentResponseSchema = z.object({
  id: z.uuid(),
  assignmentId: z.uuid(),
  studentId: z.uuid(),
  contentText: z.string().nullable(),
  fileUrl: z.string().nullable(),
  submittedAt: z.string().datetime(),
  status: studentAssignmentSubmissionStatusSchema,
});

export type SubmitAssignmentResponse = z.infer<
  typeof submitAssignmentResponseSchema
>;

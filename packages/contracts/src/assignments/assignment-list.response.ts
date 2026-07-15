import { z } from 'zod';
import { assignmentResponseSchema } from './assignment.response';

// Response from GET /assignments?patientId=
export const assignmentListResponseSchema = z.object({
  assignments: z.array(assignmentResponseSchema),
});
export type AssignmentListResponse = z.infer<
  typeof assignmentListResponseSchema
>;

import { z } from 'zod';

// Query params for GET /assignments
export const assignmentListQuerySchema = z.object({
  patientId: z.uuid(),
});
export type AssignmentListQuery = z.infer<typeof assignmentListQuerySchema>;

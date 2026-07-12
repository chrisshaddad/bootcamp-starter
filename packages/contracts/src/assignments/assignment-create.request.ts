import { z } from 'zod';

// Request for POST /assignments — Staff/Admin links a professional to a patient.
export const assignmentCreateRequestSchema = z.object({
  patientId: z.uuid(),
  professionalId: z.uuid(),
});
export type AssignmentCreateRequest = z.infer<
  typeof assignmentCreateRequestSchema
>;

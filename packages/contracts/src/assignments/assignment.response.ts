import { z } from 'zod';
import { dateSchema } from '../common';

export const assignmentStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;

// A care-team link, enriched with the professional's display info.
export const assignmentResponseSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  professionalId: z.uuid(),
  status: assignmentStatusSchema,
  fullName: z.string(),
  specialty: z.string().nullable(),
  phone: z.string(),
  createdAt: dateSchema,
});
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;

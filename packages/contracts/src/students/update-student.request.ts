import { z } from 'zod';

export const UpdateStudentRequestSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.email().optional(),
  studentCode: z.string().trim().min(1).optional(),
  dateOfBirth: z.iso.date().nullable().optional(),
});

export type UpdateStudentRequest = z.infer<typeof UpdateStudentRequestSchema>;

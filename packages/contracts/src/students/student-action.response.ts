import { z } from 'zod';
import { StudentListItemSchema } from './students-by-grade.response';

export const StudentActionResponseSchema = z.object({
  id: z.string(),
});

export const UpdateStudentResponseSchema = StudentListItemSchema;

export type StudentActionResponse = z.infer<typeof StudentActionResponseSchema>;

export type UpdateStudentResponse = z.infer<typeof UpdateStudentResponseSchema>;

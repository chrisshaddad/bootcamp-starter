import { z } from 'zod';
import { StudentListItemSchema } from './students-by-grade.response';

export const UpdateStudentResponseSchema = StudentListItemSchema;

export type UpdateStudentResponse = z.infer<typeof UpdateStudentResponseSchema>;

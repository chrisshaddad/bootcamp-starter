import { z } from 'zod';
import { TeacherListItemSchema } from './teachers-by-organization.response';

export const TeacherActionResponseSchema = z.object({
  id: z.string(),
});

export const UpdateTeacherResponseSchema = TeacherListItemSchema;

export type TeacherActionResponse = z.infer<typeof TeacherActionResponseSchema>;

export type UpdateTeacherResponse = z.infer<typeof UpdateTeacherResponseSchema>;

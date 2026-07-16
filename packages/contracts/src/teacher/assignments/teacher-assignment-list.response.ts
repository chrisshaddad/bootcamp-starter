import { z } from 'zod';
import { teacherAssignmentResponseSchema } from './teacher-assignment.response';

export const teacherAssignmentListItemResponseSchema =
  teacherAssignmentResponseSchema.extend({
    _count: z.object({
      submissions: z.number(),
    }),
  });

export const teacherAssignmentListResponseSchema = z.array(
  teacherAssignmentListItemResponseSchema,
);

export type TeacherAssignmentListItemResponse = z.infer<
  typeof teacherAssignmentListItemResponseSchema
>;

export type TeacherAssignmentListResponse = z.infer<
  typeof teacherAssignmentListResponseSchema
>;

import { z } from 'zod';
import { CourseListItemSchema } from './course-list.response';

export const UpdateCourseResponseSchema = CourseListItemSchema;

export const CourseActionResponseSchema = z.object({
  id: z.string(),
});

export type UpdateCourseResponse = z.infer<typeof UpdateCourseResponseSchema>;

export type CourseActionResponse = z.infer<typeof CourseActionResponseSchema>;

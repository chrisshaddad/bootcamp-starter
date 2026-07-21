import { z } from 'zod';
import { CourseListItemSchema } from './course-list.response';

export const UpdateCourseResponseSchema = CourseListItemSchema;

export type UpdateCourseResponse = z.infer<typeof UpdateCourseResponseSchema>;

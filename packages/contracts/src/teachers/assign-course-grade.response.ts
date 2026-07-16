import { z } from 'zod';

export const AssignCourseGradeResponseSchema = z.object({
  teacherId: z.string(),
  gradeId: z.string(),
  title: z.string(),
  createdCourseCount: z.number(),
  courseIds: z.array(z.string()),
});

export type AssignCourseGradeResponse = z.infer<
  typeof AssignCourseGradeResponseSchema
>;

import { z } from 'zod';

export const AssignCourseGradeRequestSchema = z.object({
  organizationId: z.string().uuid(),
  teacherId: z.string().uuid(),
  gradeId: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export type AssignCourseGradeRequest = z.infer<
  typeof AssignCourseGradeRequestSchema
>;

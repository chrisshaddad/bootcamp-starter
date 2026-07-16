import { z } from 'zod';

export const teacherCourseResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  joinCode: z.string().nullable(),
  createdAt: z.date(),

  subject: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string().nullable(),
  }),

  section: z
    .object({
      id: z.string(),
      name: z.string(),
      gradeLevel: z.object({
        id: z.string(),
        name: z.string(),
      }),
    })
    .nullable(),

  _count: z.object({
    enrollments: z.number(),
    assignments: z.number(),
  }),
});

export const teacherCourseListResponseSchema = z.array(
  teacherCourseResponseSchema,
);

export type TeacherCourseResponse = z.infer<typeof teacherCourseResponseSchema>;

export type TeacherCourseListResponse = z.infer<
  typeof teacherCourseListResponseSchema
>;

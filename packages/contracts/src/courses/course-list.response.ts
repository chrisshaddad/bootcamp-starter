import { z } from 'zod';

export const CourseListItemSchema = z.object({
  id: z.string(),
  organizationId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  joinCode: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),

  teacher: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),

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

export const CourseListResponseSchema = z.object({
  organizationId: z.string(),
  courses: z.array(CourseListItemSchema),
});

export type CourseListItem = z.infer<typeof CourseListItemSchema>;

export type CourseListResponse = z.infer<typeof CourseListResponseSchema>;

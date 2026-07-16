import { z } from 'zod';

export const teacherAssignmentResponseSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  createdById: z.string(),
  type: z.literal('assignment'),
  title: z.string(),
  instructions: z.string().nullable(),
  maxScore: z.number(),
  startsAt: z.date().nullable(),
  dueAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  noteToStudents: z.string().nullable(),
  status: z.enum(['draft', 'published', 'closed']),
  createdAt: z.date(),
  updatedAt: z.date(),

  course: z.object({
    id: z.string(),
    title: z.string(),
  }),
});

export type TeacherAssignmentResponse = z.infer<
  typeof teacherAssignmentResponseSchema
>;

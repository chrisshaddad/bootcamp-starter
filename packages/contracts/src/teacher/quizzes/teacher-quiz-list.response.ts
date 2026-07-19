import { z } from 'zod';

export const teacherQuizListItemResponseSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  type: z.enum(['quiz', 'exam']),
  title: z.string(),
  instructions: z.string().nullable(),
  maxScore: z.number(),
  durationMinutes: z.number(),
  startsAt: z.iso.datetime().nullable(),
  dueAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  status: z.enum(['draft', 'published', 'closed']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),

  course: z.object({
    id: z.string(),
    title: z.string(),
  }),

  _count: z.object({
    quizQuestions: z.number(),
    quizAttempts: z.number(),
  }),
});

export const teacherQuizListResponseSchema = z.array(
  teacherQuizListItemResponseSchema,
);

export type TeacherQuizListItemResponse = z.infer<
  typeof teacherQuizListItemResponseSchema
>;

export type TeacherQuizListResponse = z.infer<
  typeof teacherQuizListResponseSchema
>;

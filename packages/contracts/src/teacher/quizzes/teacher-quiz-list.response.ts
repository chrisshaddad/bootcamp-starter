import { z } from 'zod';

export const teacherQuizListItemResponseSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  type: z.enum(['quiz', 'exam']),
  title: z.string(),
  instructions: z.string().nullable(),
  maxScore: z.number(),
  durationMinutes: z.number(),
  startsAt: z.date().nullable(),
  dueAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  status: z.enum(['draft', 'published', 'closed']),
  createdAt: z.date(),
  updatedAt: z.date(),

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

import { z } from 'zod';
import { teacherQuizOptionSchema } from './create-quiz.request';

export const teacherQuizQuestionResponseSchema = z.object({
  id: z.string(),
  assignmentId: z.string(),
  questionText: z.string(),
  questionType: z.literal('mcq'),
  options: z.array(teacherQuizOptionSchema),
  correctOptionId: z.string(),
  points: z.number(),
  position: z.number(),
});

export const teacherQuizResponseSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  createdById: z.string(),
  type: z.enum(['quiz', 'exam']),
  title: z.string(),
  instructions: z.string().nullable(),
  maxScore: z.number(),
  startsAt: z.iso.datetime().nullable(),
  dueAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  durationMinutes: z.number(),
  noteToStudents: z.string().nullable(),
  status: z.enum(['draft', 'published', 'closed']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),

  course: z.object({
    id: z.string(),
    title: z.string(),
  }),

  questions: z.array(teacherQuizQuestionResponseSchema),
});

export type TeacherQuizQuestionResponse = z.infer<
  typeof teacherQuizQuestionResponseSchema
>;

export type TeacherQuizResponse = z.infer<typeof teacherQuizResponseSchema>;

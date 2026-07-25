import { z } from 'zod';
import {
  studentQuizAttemptStatusSchema,
  studentQuizAvailabilitySchema,
} from './student-quiz-list.response';

export const studentQuizOptionResponseSchema = z.object({
  id: z.uuid(),
  text: z.string(),
});

export const studentQuizQuestionResponseSchema = z.object({
  id: z.uuid(),
  questionText: z.string(),
  questionType: z.literal('mcq'),
  options: z.array(studentQuizOptionResponseSchema),
  points: z.number(),
  position: z.number().int().nonnegative(),
});

export const studentQuizResponseSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  type: z.enum(['quiz', 'exam']),
  title: z.string(),
  instructions: z.string().nullable(),
  maxScore: z.number(),
  durationMinutes: z.number(),

  startsAt: z.iso.datetime().nullable(),
  dueAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),

  noteToStudents: z.string().nullable(),

  availability: studentQuizAvailabilitySchema,
  attemptStatus: studentQuizAttemptStatusSchema,

  course: z.object({
    id: z.uuid(),
    title: z.string(),
  }),

  questions: z.array(studentQuizQuestionResponseSchema),

  attempt: z
    .object({
      id: z.uuid(),
      startedAt: z.iso.datetime(),
      submittedAt: z.iso.datetime().nullable(),
      expiresAt: z.iso.datetime(),
      autoScore: z.number().nullable(),
      totalPoints: z.number().nullable(),
    })
    .nullable(),
});

export type StudentQuizOptionResponse = z.infer<
  typeof studentQuizOptionResponseSchema
>;

export type StudentQuizQuestionResponse = z.infer<
  typeof studentQuizQuestionResponseSchema
>;

export type StudentQuizResponse = z.infer<typeof studentQuizResponseSchema>;

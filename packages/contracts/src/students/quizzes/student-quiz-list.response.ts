import { z } from 'zod';

export const studentQuizAvailabilitySchema = z.enum([
  'upcoming',
  'available',
  'closed',
]);

export const studentQuizAttemptStatusSchema = z.enum([
  'none',
  'in_progress',
  'expired',
  'submitted',
]);

export const studentQuizListItemResponseSchema = z.object({
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

  availability: studentQuizAvailabilitySchema,
  attemptStatus: studentQuizAttemptStatusSchema,

  course: z.object({
    id: z.uuid(),
    title: z.string(),
  }),

  questionCount: z.number().int().nonnegative(),

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

export const studentQuizListResponseSchema = z.array(
  studentQuizListItemResponseSchema,
);

export type StudentQuizAvailability = z.infer<
  typeof studentQuizAvailabilitySchema
>;

export type StudentQuizAttemptStatus = z.infer<
  typeof studentQuizAttemptStatusSchema
>;

export type StudentQuizListItemResponse = z.infer<
  typeof studentQuizListItemResponseSchema
>;

export type StudentQuizListResponse = z.infer<
  typeof studentQuizListResponseSchema
>;

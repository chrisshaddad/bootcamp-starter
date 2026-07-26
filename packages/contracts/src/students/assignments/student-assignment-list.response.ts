import { z } from 'zod';

export const studentAssignmentSubmissionStatusSchema = z.enum([
  'submitted',
  'late',
  'graded',
]);

export const studentAssignmentAvailabilitySchema = z.enum([
  'upcoming',
  'open',
  'closed',
]);

export const studentAssignmentListItemResponseSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  type: z.literal('assignment'),
  title: z.string(),
  instructions: z.string().nullable(),
  maxScore: z.number(),
  startsAt: z.string().datetime().nullable(),
  dueAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  availability: studentAssignmentAvailabilitySchema,

  course: z.object({
    id: z.uuid(),
    title: z.string(),
  }),

  submission: z
    .object({
      id: z.uuid(),
      submittedAt: z.string().datetime(),
      status: studentAssignmentSubmissionStatusSchema,
      score: z.number().nullable(),
    })
    .nullable(),
});

export const studentAssignmentListResponseSchema = z.array(
  studentAssignmentListItemResponseSchema,
);

export type StudentAssignmentSubmissionStatus = z.infer<
  typeof studentAssignmentSubmissionStatusSchema
>;

export type StudentAssignmentAvailability = z.infer<
  typeof studentAssignmentAvailabilitySchema
>;

export type StudentAssignmentListItemResponse = z.infer<
  typeof studentAssignmentListItemResponseSchema
>;

export type StudentAssignmentListResponse = z.infer<
  typeof studentAssignmentListResponseSchema
>;

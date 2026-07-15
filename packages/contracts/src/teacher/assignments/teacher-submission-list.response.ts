import { z } from 'zod';

export const teacherSubmissionListItemResponseSchema = z.object({
  id: z.uuid(),
  assignmentId: z.uuid(),
  studentId: z.uuid(),
  contentText: z.string().nullable(),
  fileUrl: z.string().nullable(),
  answers: z.unknown(),
  teacherNote: z.string().nullable(),
  submittedAt: z.string().datetime(),
  status: z.enum(['submitted', 'late', 'graded']),

  student: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
  }),

  grade: z
    .object({
      id: z.uuid(),
      score: z.number(),
      feedbackText: z.string().nullable(),
      gradedAt: z.string().datetime(),
    })
    .nullable(),
});

export const teacherSubmissionListResponseSchema = z.array(
  teacherSubmissionListItemResponseSchema,
);

export type TeacherSubmissionListItemResponse = z.infer<
  typeof teacherSubmissionListItemResponseSchema
>;

export type TeacherSubmissionListResponse = z.infer<
  typeof teacherSubmissionListResponseSchema
>;

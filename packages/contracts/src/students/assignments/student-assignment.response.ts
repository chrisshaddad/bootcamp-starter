import { z } from 'zod';
import {
  studentAssignmentAvailabilitySchema,
  studentAssignmentSubmissionStatusSchema,
} from './student-assignment-list.response';

export const studentAssignmentResponseSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  type: z.literal('assignment'),
  title: z.string(),
  instructions: z.string().nullable(),
  noteToStudents: z.string().nullable(),
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
      contentText: z.string().nullable(),
      fileUrl: z.string().nullable(),
      submittedAt: z.string().datetime(),
      status: studentAssignmentSubmissionStatusSchema,
      teacherNote: z.string().nullable(),

      grade: z
        .object({
          id: z.uuid(),
          score: z.number(),
          feedbackText: z.string().nullable(),
          gradedAt: z.string().datetime(),
        })
        .nullable(),
    })
    .nullable(),
});

export type StudentAssignmentResponse = z.infer<
  typeof studentAssignmentResponseSchema
>;

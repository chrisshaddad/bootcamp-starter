import { z } from 'zod';
import { createTeacherQuizQuestionSchema } from './create-quiz.request';

export const updateTeacherQuizRequestSchema = z
  .object({
    courseId: z.uuid().optional(),

    type: z.enum(['quiz', 'exam']).optional(),

    title: z
      .string()
      .trim()
      .min(3, 'Title must contain at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters')
      .optional(),

    instructions: z
      .string()
      .trim()
      .max(5000, 'Instructions cannot exceed 5000 characters')
      .nullable()
      .optional(),

    durationMinutes: z
      .number()
      .int('Duration must be a whole number')
      .min(1, 'Duration must be at least one minute')
      .max(480, 'Duration cannot exceed 480 minutes')
      .optional(),

    startsAt: z.iso.datetime().nullable().optional(),
    dueAt: z.iso.datetime().nullable().optional(),
    endsAt: z.iso.datetime().nullable().optional(),

    noteToStudents: z
      .string()
      .trim()
      .max(2000, 'Note cannot exceed 2000 characters')
      .nullable()
      .optional(),

    status: z.enum(['draft', 'published']).optional(),

    questions: z
      .array(createTeacherQuizQuestionSchema)
      .min(1, 'A quiz must contain at least one question')
      .max(100, 'A quiz cannot contain more than 100 questions')
      .optional(),
  })
  .superRefine((quiz, context) => {
    if (Object.values(quiz).every((value) => value === undefined)) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'At least one field must be provided',
      });
    }

    const startsAt = quiz.startsAt ? new Date(quiz.startsAt) : null;
    const dueAt = quiz.dueAt ? new Date(quiz.dueAt) : null;
    const endsAt = quiz.endsAt ? new Date(quiz.endsAt) : null;

    if (startsAt && endsAt && startsAt >= endsAt) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End date must be after the start date',
      });
    }

    if (startsAt && dueAt && dueAt < startsAt) {
      context.addIssue({
        code: 'custom',
        path: ['dueAt'],
        message: 'Due date cannot be before the start date',
      });
    }

    if (dueAt && endsAt && dueAt > endsAt) {
      context.addIssue({
        code: 'custom',
        path: ['dueAt'],
        message: 'Due date cannot be after the end date',
      });
    }

    if (quiz.questions) {
      const positions = quiz.questions.map((question) => question.position);

      if (new Set(positions).size !== positions.length) {
        context.addIssue({
          code: 'custom',
          path: ['questions'],
          message: 'Question positions must be unique',
        });
      }
    }
  });

export type UpdateTeacherQuizRequest = z.infer<
  typeof updateTeacherQuizRequestSchema
>;

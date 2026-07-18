import { z } from 'zod';

export const teacherQuizOptionSchema = z.object({
  id: z.uuid(),

  text: z
    .string()
    .trim()
    .min(1, 'Option text is required')
    .max(500, 'Option text cannot exceed 500 characters'),
});

export const createTeacherQuizQuestionSchema = z
  .object({
    questionText: z
      .string()
      .trim()
      .min(1, 'Question text is required')
      .max(3000, 'Question text cannot exceed 3000 characters'),

    options: z
      .array(teacherQuizOptionSchema)
      .min(2, 'Each question must have at least two options')
      .max(10, 'Each question cannot have more than ten options'),

    correctOptionId: z.uuid(),

    points: z
      .number()
      .positive('Question points must be greater than zero')
      .max(1000, 'Question points cannot exceed 1000'),

    position: z
      .number()
      .int('Question position must be a whole number')
      .nonnegative('Question position cannot be negative'),
  })
  .superRefine((question, context) => {
    const optionIds = question.options.map((option) => option.id);
    const uniqueOptionIds = new Set(optionIds);

    if (uniqueOptionIds.size !== optionIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Option IDs must be unique within a question',
      });
    }

    if (!uniqueOptionIds.has(question.correctOptionId)) {
      context.addIssue({
        code: 'custom',
        path: ['correctOptionId'],
        message: 'Correct option must match one of the question options',
      });
    }
  });

export const createTeacherQuizRequestSchema = z
  .object({
    courseId: z.uuid(),

    type: z.enum(['quiz', 'exam']).default('quiz'),

    title: z
      .string()
      .trim()
      .min(3, 'Title must contain at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters'),

    instructions: z
      .string()
      .trim()
      .max(5000, 'Instructions cannot exceed 5000 characters')
      .optional(),

    durationMinutes: z
      .number()
      .int('Duration must be a whole number')
      .min(1, 'Duration must be at least one minute')
      .max(480, 'Duration cannot exceed 480 minutes'),

    startsAt: z.iso.datetime().optional(),
    dueAt: z.iso.datetime().optional(),
    endsAt: z.iso.datetime().optional(),

    noteToStudents: z
      .string()
      .trim()
      .max(2000, 'Note cannot exceed 2000 characters')
      .optional(),

    status: z.enum(['draft', 'published']).default('draft'),

    questions: z
      .array(createTeacherQuizQuestionSchema)
      .min(1, 'A quiz must contain at least one question')
      .max(100, 'A quiz cannot contain more than 100 questions'),
  })
  .superRefine((quiz, context) => {
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

    const positions = quiz.questions.map((question) => question.position);

    if (new Set(positions).size !== positions.length) {
      context.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'Question positions must be unique',
      });
    }
  });

export type TeacherQuizOption = z.infer<typeof teacherQuizOptionSchema>;

export type CreateTeacherQuizQuestion = z.infer<
  typeof createTeacherQuizQuestionSchema
>;

export type CreateTeacherQuizRequest = z.infer<
  typeof createTeacherQuizRequestSchema
>;

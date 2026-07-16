import { z } from 'zod';

export const updateTeacherAssignmentRequestSchema = z
  .object({
    courseId: z.uuid().optional(),

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

    maxScore: z
      .number()
      .positive('Maximum score must be greater than zero')
      .max(1000, 'Maximum score cannot exceed 1000')
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

    status: z.enum(['draft', 'published', 'closed']).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateTeacherAssignmentRequest = z.infer<
  typeof updateTeacherAssignmentRequestSchema
>;

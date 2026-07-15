import { z } from 'zod';

export const createTeacherAssignmentRequestSchema = z.object({
  courseId: z.uuid(),

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

  maxScore: z
    .number()
    .positive('Maximum score must be greater than zero')
    .max(1000, 'Maximum score cannot exceed 1000')
    .default(100),

  startsAt: z.iso.datetime().optional(),
  dueAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().optional(),

  noteToStudents: z
    .string()
    .trim()
    .max(2000, 'Note cannot exceed 2000 characters')
    .optional(),

  status: z.enum(['draft', 'published']).default('draft'),
});

export type CreateTeacherAssignmentRequest = z.infer<
  typeof createTeacherAssignmentRequestSchema
>;

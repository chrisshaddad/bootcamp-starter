import { z } from 'zod';

export const UpdateCourseRequestSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequestSchema>;

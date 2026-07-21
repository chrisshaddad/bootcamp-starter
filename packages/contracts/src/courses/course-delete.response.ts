import { z } from 'zod';

export const DeleteCourseResponseSchema = z.object({
  id: z.string(),
});

export type DeleteCourseResponse = z.infer<typeof DeleteCourseResponseSchema>;

import { z } from 'zod';

export const TeacherActionResponseSchema = z.object({
  id: z.string(),
});

export type TeacherActionResponse = z.infer<typeof TeacherActionResponseSchema>;

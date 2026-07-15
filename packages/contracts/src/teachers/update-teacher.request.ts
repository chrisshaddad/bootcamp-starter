import { z } from 'zod';

export const UpdateTeacherRequestSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
});

export type UpdateTeacherRequest = z.infer<typeof UpdateTeacherRequestSchema>;

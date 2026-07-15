import { z } from 'zod';

export const StudentActionResponseSchema = z.object({
  id: z.string(),
});

export type StudentActionResponse = z.infer<typeof StudentActionResponseSchema>;

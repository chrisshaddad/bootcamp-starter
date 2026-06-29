import { z } from 'zod';
import { dateSchema } from '../common';

export const instructorResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable(),
  specialization: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type InstructorResponse = z.infer<typeof instructorResponseSchema>;

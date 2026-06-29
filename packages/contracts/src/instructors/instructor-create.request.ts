import { z } from 'zod';

export const instructorCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Valid email required').optional(),
  specialization: z.string().trim().optional(),
});
export type InstructorCreateRequest = z.infer<
  typeof instructorCreateRequestSchema
>;

import { z } from 'zod';

export const instructorCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  specialization: z.string().trim().optional().or(z.literal('')),
});
export type InstructorCreateRequest = z.infer<
  typeof instructorCreateRequestSchema
>;

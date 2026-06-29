import { z } from 'zod';

export const instructorUpdateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  email: z.string().email('Valid email required').nullable().optional(),
  specialization: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type InstructorUpdateRequest = z.infer<
  typeof instructorUpdateRequestSchema
>;

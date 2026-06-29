import { z } from 'zod';

export const instructorUpdateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  email: z
    .union([z.string().email('Valid email required'), z.literal('')])
    .nullable()
    .optional()
    .transform((e) => (e === '' ? null : e)),
  specialization: z
    .union([z.string().trim(), z.literal('')])
    .nullable()
    .optional()
    .transform((e) => (e === '' ? null : e)),
  isActive: z.boolean().optional(),
});
export type InstructorUpdateRequest = z.infer<
  typeof instructorUpdateRequestSchema
>;

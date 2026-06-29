import { z } from 'zod';

export const instructorCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z
    .union([z.string().email('Valid email required'), z.literal('')])
    .optional()
    .transform((e) => (e === '' ? undefined : e)),
  specialization: z
    .union([z.string().trim(), z.literal('')])
    .optional()
    .transform((e) => (e === '' ? undefined : e)),
});
export type InstructorCreateRequest = z.infer<
  typeof instructorCreateRequestSchema
>;

import { z } from 'zod';
import { instructorResponseSchema } from './instructor.response';

export const instructorListResponseSchema = z.object({
  instructors: z.array(instructorResponseSchema),
  total: z.number().int().nonnegative(),
});
export type InstructorListResponse = z.infer<
  typeof instructorListResponseSchema
>;

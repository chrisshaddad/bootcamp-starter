import { z } from 'zod';
import { instructorResponseSchema } from './instructor.response';

export const instructorAvailabilityResponseSchema = z.object({
  instructors: z.array(instructorResponseSchema),
});
export type InstructorAvailabilityResponse = z.infer<
  typeof instructorAvailabilityResponseSchema
>;

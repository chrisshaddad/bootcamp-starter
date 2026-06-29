import { z } from 'zod';

export const instructorAvailabilityQuerySchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
});
export type InstructorAvailabilityQuery = z.infer<
  typeof instructorAvailabilityQuerySchema
>;

import { z } from 'zod';

export const instructorListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type InstructorListQuery = z.infer<typeof instructorListQuerySchema>;

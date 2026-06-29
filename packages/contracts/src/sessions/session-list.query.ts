import { z } from 'zod';

export const sessionListQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;

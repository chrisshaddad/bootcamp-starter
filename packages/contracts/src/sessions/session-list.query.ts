import { z } from 'zod';

/** Allowed session status values for filtering */
export const SessionStatus = {
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

/** Query parameters for listing gym sessions */
export const sessionListQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED']).optional(),
});
export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;

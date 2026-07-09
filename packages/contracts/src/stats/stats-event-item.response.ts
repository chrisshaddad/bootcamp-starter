import { z } from 'zod';
import { dateSchema } from '../common';

export const statsEventItemSchema = z.object({
  eventId: z.uuid(),
  eventName: z.string(),
  startsAt: dateSchema,
  isUpcoming: z.boolean(),
  presenter: z
    .object({
      id: z.uuid(),
      username: z.string(),
    })
    .nullable(),
  registeredCount: z.number(),
  attendedCount: z.number(),
  skippedCount: z.number(),
  pendingCount: z.number(),
  attendanceRate: z.number().nullable(),
});
export type StatsEventItem = z.infer<typeof statsEventItemSchema>;

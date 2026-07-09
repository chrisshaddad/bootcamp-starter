import { z } from 'zod';
import { dateSchema } from '../common';
import { attendanceStatusSchema } from '../events/attendance-status.schema';
import { statsUserItemSchema } from './stats-user-item.response';

export const statsUserEventRowSchema = z.object({
  eventId: z.uuid(),
  eventName: z.string(),
  startsAt: dateSchema,
  attendanceStatus: attendanceStatusSchema,
});
export type StatsUserEventRow = z.infer<typeof statsUserEventRowSchema>;

export const statsUserDetailResponseSchema = statsUserItemSchema.extend({
  events: z.array(statsUserEventRowSchema),
});
export type StatsUserDetailResponse = z.infer<
  typeof statsUserDetailResponseSchema
>;

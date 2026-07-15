import { z } from 'zod';
import { dateSchema } from '../common';
import { attendanceStatusSchema } from './attendance-status.schema';

export const eventAttendeeSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  attendanceStatus: attendanceStatusSchema,
  registeredAt: dateSchema,
});
export type EventAttendee = z.infer<typeof eventAttendeeSchema>;

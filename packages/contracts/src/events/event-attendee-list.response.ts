import { z } from 'zod';
import { eventAttendeeSchema } from './event-attendee.response';

export const eventAttendeeListResponseSchema = z.object({
  attendees: z.array(eventAttendeeSchema),
  total: z.number(),
});
export type EventAttendeeListResponse = z.infer<
  typeof eventAttendeeListResponseSchema
>;

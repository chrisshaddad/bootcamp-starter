import { z } from 'zod';
import { eventAttendeeSchema } from './event-attendee.response';

export const eventAttendanceUpdateResponseSchema = eventAttendeeSchema;
export type EventAttendanceUpdateResponse = z.infer<
  typeof eventAttendanceUpdateResponseSchema
>;

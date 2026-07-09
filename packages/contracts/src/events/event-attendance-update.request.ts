import { z } from 'zod';
import { attendanceStatusSchema } from './attendance-status.schema';

export const eventAttendanceUpdateRequestSchema = z.object({
  attendanceStatus: attendanceStatusSchema.exclude(['PENDING']),
});
export type EventAttendanceUpdateRequest = z.infer<
  typeof eventAttendanceUpdateRequestSchema
>;

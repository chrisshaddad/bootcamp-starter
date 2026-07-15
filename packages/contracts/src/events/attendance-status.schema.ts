import { z } from 'zod';

export const attendanceStatusSchema = z.enum([
  'PENDING',
  'ATTENDED',
  'SKIPPED',
]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

import { z } from 'zod';

/**
 * Validates that a date string or Date object is not in the past (i.e., >= today).
 * Evaluated at schema parse time — both API and web use this to reject past dates.
 */
function isNotPastDate(value: string | Date): boolean {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return false;
  // Compare at day granularity — strip time so a session starting today at 00:00 is still valid
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

/** Request schema for creating a new gym session */
export const sessionCreateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  instructorId: z.string().uuid().optional().nullable(),
  startsAt: z.union([z.string().datetime(), z.date()]).refine(isNotPastDate, {
    message: 'Sessions cannot be scheduled in the past',
  }),
  endsAt: z.union([z.string().datetime(), z.date()]).refine(isNotPastDate, {
    message: 'Sessions cannot be scheduled in the past',
  }),
  capacity: z.number().int().positive('Capacity must be greater than 0'),
});

export type SessionCreateRequest = z.infer<typeof sessionCreateRequestSchema>;

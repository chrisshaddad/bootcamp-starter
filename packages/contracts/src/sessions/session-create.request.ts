import { z } from 'zod';
import { dateSchema } from '../common';

export const sessionCreateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  instructorId: z.string().uuid().optional().nullable(),
  startsAt: z.union([z.string().datetime(), z.date()]),
  endsAt: z.union([z.string().datetime(), z.date()]),
  capacity: z.number().int().positive('Capacity must be greater than 0'),
});
export type SessionCreateRequest = z.infer<typeof sessionCreateRequestSchema>;

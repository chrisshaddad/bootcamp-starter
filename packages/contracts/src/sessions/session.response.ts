import { z } from 'zod';
import { dateSchema } from '../common';
import { instructorResponseSchema } from '../instructors/instructor.response';

export const sessionStatusSchema = z.enum([
  'SCHEDULED',
  'CANCELLED',
  'COMPLETED',
]);
export type GymSessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  instructorId: z.string().uuid().nullable(),
  startsAt: dateSchema,
  endsAt: dateSchema,
  capacity: z.number().int().positive(),
  status: sessionStatusSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  instructor: instructorResponseSchema.nullable().optional(),
  _count: z
    .object({
      bookings: z.number().int(),
    })
    .optional(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

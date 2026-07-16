import { z } from 'zod';
import { dateSchema } from '../common';

export const eventUpdateRequestSchema = z.object({
  eventName: z.string().trim().min(1).max(200).optional(),
  startsAt: dateSchema.optional(),
  presenterId: z.uuid().optional().nullable(),
});
export type EventUpdateRequest = z.infer<typeof eventUpdateRequestSchema>;

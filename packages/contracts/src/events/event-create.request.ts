import { z } from 'zod';
import { dateSchema } from '../common';

export const eventCreateRequestSchema = z.object({
  eventName: z.string().trim().min(1).max(200),
  startsAt: dateSchema,
  presenterId: z.uuid().optional().nullable(),
  organizationId: z.uuid().optional(),
});
export type EventCreateRequest = z.infer<typeof eventCreateRequestSchema>;

import { z } from 'zod';
import { dateSchema } from '../common';
import { eventStatusSchema } from './event-status.schema';

const eventPresenterSchema = z.object({
  id: z.uuid(),
  username: z.string(),
});

export const eventSchema = z.object({
  id: z.uuid(),
  eventName: z.string(),
  presenterId: z.uuid().nullable(),
  organizationId: z.uuid(),
  startsAt: dateSchema,
  status: eventStatusSchema,
  isRegistered: z.boolean().optional(),
  isUpcoming: z.boolean().optional(),
  hostedByMe: z.boolean().optional(),
  presenter: eventPresenterSchema.nullable().optional(),
  attendeeCount: z.number(),
});
export type Event = z.infer<typeof eventSchema>;

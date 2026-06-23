import { z } from 'zod';
import { dateSchema } from '../common';

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
  isRegistered: z.boolean().optional(),
  isUpcoming: z.boolean().optional(),
  presenter: eventPresenterSchema.nullable().optional(),
  attendeeCount: z.number().optional(),
});
export type Event = z.infer<typeof eventSchema>;

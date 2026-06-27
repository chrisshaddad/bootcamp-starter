import { z } from 'zod';
import { dateSchema } from '../common';

export const eventDetailResponseSchema = z.object({
  id: z.uuid(),
  eventName: z.string(),
  presenterId: z.uuid().nullable(),
  organizationId: z.uuid(),
  startsAt: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  isRegistered: z.boolean(),
  isUpcoming: z.boolean(),
  canRegister: z.boolean(),
  attendeeCount: z.number(),
  presenter: z
    .object({
      id: z.uuid(),
      username: z.string(),
    })
    .nullable()
    .optional(),
});
export type EventDetailResponse = z.infer<typeof eventDetailResponseSchema>;

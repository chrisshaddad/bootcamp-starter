import { z } from 'zod';
import { dateSchema } from '../common';

export const publicEventDetailResponseSchema = z.object({
  id: z.uuid(),
  eventName: z.string(),
  startsAt: dateSchema,
  organizationId: z.uuid(),
  organizationName: z.string(),
  presenter: z
    .object({
      id: z.uuid(),
      username: z.string(),
    })
    .nullable(),
  attendeeCount: z.number(),
});
export type PublicEventDetailResponse = z.infer<
  typeof publicEventDetailResponseSchema
>;

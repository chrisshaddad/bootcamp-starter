import { z } from 'zod';
import { dateSchema } from '../common';

export const publicEventSchema = z.object({
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
});
export type PublicEvent = z.infer<typeof publicEventSchema>;

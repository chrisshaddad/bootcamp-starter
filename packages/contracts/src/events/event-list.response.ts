import { z } from 'zod';
import { eventSchema } from './event.response';

export const eventListResponseSchema = z.object({
  events: z.array(eventSchema),
  total: z.number(),
});
export type EventListResponse = z.infer<typeof eventListResponseSchema>;

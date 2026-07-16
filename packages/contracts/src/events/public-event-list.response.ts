import { z } from 'zod';
import { publicEventSchema } from './public-event.response';

export const publicEventListResponseSchema = z.object({
  events: z.array(publicEventSchema),
  total: z.number(),
});
export type PublicEventListResponse = z.infer<
  typeof publicEventListResponseSchema
>;

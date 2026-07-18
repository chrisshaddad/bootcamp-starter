import { z } from 'zod';
import { publicEventSchema } from './public-event.response';

export const publicEventDetailResponseSchema = publicEventSchema.extend({
  attendeeCount: z.number(),
});
export type PublicEventDetailResponse = z.infer<
  typeof publicEventDetailResponseSchema
>;

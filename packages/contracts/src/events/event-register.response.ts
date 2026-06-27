import { z } from 'zod';

export const eventRegisterResponseSchema = z.object({
  message: z.string(),
  eventId: z.uuid(),
  isRegistered: z.literal(true),
});
export type EventRegisterResponse = z.infer<typeof eventRegisterResponseSchema>;

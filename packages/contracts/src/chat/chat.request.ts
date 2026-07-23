import { z } from 'zod';
import { chatMessageSchema } from './chat-message.schema';

// Request for POST /portal/chat - the client resends the full running
// history each call (stateless backend), capped so it can't balloon cost.
export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(40),
  })
  .refine((r) => r.messages[r.messages.length - 1]?.role === 'user', {
    message: 'The last message must be from the user',
  });
export type ChatRequest = z.infer<typeof chatRequestSchema>;

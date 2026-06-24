import { z } from 'zod';

// Request for POST /chat — the conversation so far, sent as AI SDK UI messages
// by the web client's `useChat`. The AI SDK owns the full UIMessage shape, so we
// validate only the envelope here (a non-empty list).
export const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1, 'At least one message is required'),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

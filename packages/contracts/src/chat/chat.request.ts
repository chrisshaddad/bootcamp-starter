import { z } from 'zod';

// Each message on the wire is an AI SDK UI message. The SDK owns the full
// UIMessage shape, so we validate the essentials (an object with a `role`) and
// pass the rest (`id`, `parts`, metadata, …) through untouched — rejecting
// non-object items that would otherwise fail later in the streaming path.
const uiMessageSchema = z.looseObject({
  role: z.string(),
});

// Request for POST /chat — the conversation so far, sent by the web client's `useChat`.
export const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1, 'At least one message is required'),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

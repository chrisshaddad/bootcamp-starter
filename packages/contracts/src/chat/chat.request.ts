import { z } from 'zod';

// A single turn in the assistant conversation. Only `user` and `assistant`
// roles cross the wire — the system prompt and any tool-call turns are added
// server-side and never accepted from the client.
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1, 'Message cannot be empty').max(4000),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Request for POST /chat. The full visible history is resent each turn (the API
// is stateless); the server prepends the system prompt and drives the tool
// loop. No message-count cap — a conversation can run as long as the user
// likes; the model's large context window is the practical bound.
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

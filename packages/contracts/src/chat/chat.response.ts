import { z } from 'zod';
import { chatMessageSchema } from './chat-message.schema';

export const chatReferencedBookSchema = z.object({
  id: z.uuid(),
  title: z.string(),
});
export type ChatReferencedBook = z.infer<typeof chatReferencedBookSchema>;

// Response shape for POST /portal/chat
export const chatResponseSchema = z.object({
  message: chatMessageSchema, // always role: 'assistant'
  referencedBooks: z.array(chatReferencedBookSchema),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

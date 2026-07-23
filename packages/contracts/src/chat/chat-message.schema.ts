import { z } from 'zod';

export const chatMessageRoleSchema = z.enum(['user', 'assistant']);
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;

export const chatMessageSchema = z.object({
  role: chatMessageRoleSchema,
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

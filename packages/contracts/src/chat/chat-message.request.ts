import { z } from 'zod';

export const chatMessageRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
});

export type ChatMessageRequest = z.infer<typeof chatMessageRequestSchema>;

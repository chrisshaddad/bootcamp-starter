import { z } from 'zod';

export const chatSourceSchema = z.object({
  type: z.string(),
  id: z.string(),
  title: z.string(),
});

export type ChatSource = z.infer<typeof chatSourceSchema>;

export const chatMessageResponseSchema = z.object({
  reply: z.string(),
  sources: z.array(chatSourceSchema).optional(),
});

export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>;

import { z } from 'zod';

export const groupCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type GroupCreateRequest = z.infer<typeof groupCreateRequestSchema>;

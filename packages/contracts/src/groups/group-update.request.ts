import { z } from 'zod';

export const groupUpdateRequestSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type GroupUpdateRequest = z.infer<typeof groupUpdateRequestSchema>;

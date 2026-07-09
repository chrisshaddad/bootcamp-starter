import { z } from 'zod';

export const skillUpdateRequestSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  category: z.string().min(2).max(50).optional(),
});

export type SkillUpdateRequest = z.infer<typeof skillUpdateRequestSchema>;

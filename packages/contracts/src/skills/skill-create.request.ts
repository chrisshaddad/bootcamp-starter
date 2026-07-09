import { z } from 'zod';

export const skillCreateRequestSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
});

export type SkillCreateRequest = z.infer<typeof skillCreateRequestSchema>;

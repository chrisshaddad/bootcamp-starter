import { z } from 'zod';

export const skillListQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SkillListQuery = z.infer<typeof skillListQuerySchema>;

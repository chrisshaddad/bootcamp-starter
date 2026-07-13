import { z } from 'zod';
import { skillResponseSchema } from './skill.response';

export const skillListResponseSchema = z.object({
  skills: z.array(skillResponseSchema),
  total: z.number(),
});

export type SkillListResponse = z.infer<typeof skillListResponseSchema>;

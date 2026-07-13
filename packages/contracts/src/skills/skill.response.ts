import { z } from 'zod';
import { dateSchema } from '../common';

export const skillResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  organizationId: z.string().uuid(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export type SkillResponse = z.infer<typeof skillResponseSchema>;

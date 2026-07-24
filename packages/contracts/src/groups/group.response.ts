import { z } from 'zod';
import { dateSchema } from '../common';

export const groupSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  organizationId: z.uuid(),
  memberCount: z.number(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type Group = z.infer<typeof groupSchema>;

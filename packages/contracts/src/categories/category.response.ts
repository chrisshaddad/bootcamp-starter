import { z } from 'zod';
import { dateSchema } from '../common';

// Response shape for a single Category
export const categoryResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

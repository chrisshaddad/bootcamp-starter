import { z } from 'zod';

export const publicEventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  organizationId: z.uuid().optional(),
});
export type PublicEventListQuery = z.infer<typeof publicEventListQuerySchema>;

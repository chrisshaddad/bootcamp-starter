import { z } from 'zod';

export const statsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  organizationId: z.uuid().optional(),
});
export type StatsListQuery = z.infer<typeof statsListQuerySchema>;

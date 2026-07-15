import { z } from 'zod';

export const statsEventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  organizationId: z.uuid().optional(),
  upcoming: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});
export type StatsEventListQuery = z.infer<typeof statsEventListQuerySchema>;

import { z } from 'zod';

export const serviceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  activeOnly: z.coerce.boolean().default(false),
});

export type ServiceListQuery = z.infer<typeof serviceListQuerySchema>;

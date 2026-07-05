import { z } from 'zod';
import { institutionStatusSchema } from './institution-status.schema';

// Query params for GET /institutions
export const institutionListQuerySchema = z.object({
  status: institutionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type InstitutionListQuery = z.infer<typeof institutionListQuerySchema>;

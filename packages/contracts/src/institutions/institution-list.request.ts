import { z } from 'zod';
import { institutionStatusSchema } from './institution-status.schema';
import { paginationQuerySchema } from '../common/pagination';

// Query params for GET /institutions
export const institutionListQuerySchema = z.object({
  status: institutionStatusSchema.optional(),
  ...paginationQuerySchema.shape,
});
export type InstitutionListQuery = z.infer<typeof institutionListQuerySchema>;

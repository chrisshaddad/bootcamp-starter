import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';

// Query params for GET /patients
export const patientListQuerySchema = z.object({
  search: z.string().optional(),
  unassigned: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  ...paginationQuerySchema.shape,
});
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

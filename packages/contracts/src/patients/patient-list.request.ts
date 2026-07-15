import { z } from 'zod';

// Query params for GET /patients
export const patientListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

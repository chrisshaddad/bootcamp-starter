import { z } from 'zod';
import { applicationStatusSchema } from './application-status.schema';

export const applicationListQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  opportunityId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

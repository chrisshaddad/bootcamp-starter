import { z } from 'zod';
import { applicationStatusSchema } from './application-status.schema';

export const applicationListQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  opportunityId: z.string().uuid().optional(),
  // When true, scopes results to applications submitted by the current
  // user's direct reports instead of the caller's own/org-wide applications.
  team: z
    .preprocess((value) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    }, z.boolean())
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

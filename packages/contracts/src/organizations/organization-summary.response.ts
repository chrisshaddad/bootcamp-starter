import { z } from 'zod';
import { organizationStatusSchema } from './organization-status.schema';

// Response for GET /organizations/summary (SUPER_ADMIN)
export const organizationSummaryResponseSchema = z.object({
  totalOrganizations: z.number(),
  pendingApprovals: z.number(),
  totalUsers: z.number(),
  statusBreakdown: z.array(
    z.object({ status: organizationStatusSchema, count: z.number() }),
  ),
  organizationsPerDay: z.array(
    z.object({ date: z.string(), count: z.number() }),
  ),
});
export type OrganizationSummaryResponse = z.infer<
  typeof organizationSummaryResponseSchema
>;

import { z } from 'zod';
import { dateSchema } from '../common';

// Response for GET /portal/dashboard/summary (patron: MEMBER, scoped to their
// membership in the active organization)
export const portalDashboardSummaryResponseSchema = z.object({
  activeRentals: z.number(),
  overdueRentals: z.number(),
  totalFinesOwed: z.string(),
  activeReservations: z.number(),
  readyForPickup: z.number(),
  totalPurchases: z.number(),
  upcomingDue: z.array(
    z.object({ bookTitle: z.string(), dueDate: dateSchema }),
  ),
});
export type PortalDashboardSummaryResponse = z.infer<
  typeof portalDashboardSummaryResponseSchema
>;

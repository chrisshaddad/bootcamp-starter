import { z } from 'zod';
import { dateSchema } from '../common';

// Response for GET /portal/dashboard/summary (patron: MEMBER) - aggregated
// across every one of the caller's library memberships, not just the
// session's active library. libraryName on upcomingDue disambiguates when a
// patron holds cards at more than one library.
export const portalDashboardSummaryResponseSchema = z.object({
  activeRentals: z.number(),
  overdueRentals: z.number(),
  totalFinesOwed: z.string(),
  activeReservations: z.number(),
  readyForPickup: z.number(),
  totalPurchases: z.number(),
  upcomingDue: z.array(
    z.object({
      bookTitle: z.string(),
      dueDate: dateSchema,
      libraryName: z.string(),
    }),
  ),
});
export type PortalDashboardSummaryResponse = z.infer<
  typeof portalDashboardSummaryResponseSchema
>;

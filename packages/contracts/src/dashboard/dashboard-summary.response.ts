import { z } from 'zod';
import { libraryMemberStatusSchema } from '../library-members';

// Response for GET /dashboard/summary (staff: ORG_ADMIN/LIBRARIAN)
export const dashboardSummaryResponseSchema = z.object({
  activeRentals: z.number(),
  overdueRentals: z.number(),
  totalBooks: z.number(),
  totalCopies: z.number(),
  availableCopies: z.number(),
  totalMembers: z.number(),
  pendingMembers: z.number(),
  activeReservations: z.number(),
  revenueTotal: z.string(),
  rentalsPerDay: z.array(z.object({ date: z.string(), count: z.number() })),
  memberStatusBreakdown: z.array(
    z.object({ status: libraryMemberStatusSchema, count: z.number() }),
  ),
});
export type DashboardSummaryResponse = z.infer<
  typeof dashboardSummaryResponseSchema
>;

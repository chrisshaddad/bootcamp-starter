import {
  BookOpen,
  Bookmark,
  CalendarClock,
  Clock,
  DollarSign,
  Library,
  UserCog,
  Users,
} from 'lucide-react';
import { libraryMemberStatusSchema } from '@repo/contracts';
import type { DashboardSummaryResponse } from '@repo/contracts';
import { StatTile } from './stat-tile';
import { TrendChart } from './trend-chart';
import { StatusBreakdownChart } from './status-breakdown-chart';
import { MEMBER_STATUS_LABELS } from '@/lib/status-maps';

export function StaffDashboard({
  summary,
}: {
  summary: DashboardSummaryResponse;
}) {
  const memberStatusCounts = Object.fromEntries(
    summary.memberStatusBreakdown.map((row) => [row.status, row.count]),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active rentals"
          value={summary.activeRentals}
          icon={Clock}
        />
        <StatTile
          label="Overdue"
          value={summary.overdueRentals}
          icon={CalendarClock}
          tone={summary.overdueRentals > 0 ? 'text-error' : undefined}
        />
        <StatTile
          label="Available copies"
          value={summary.availableCopies}
          icon={BookOpen}
          caption={`of ${summary.totalCopies} total copies`}
        />
        <StatTile
          label="Books in catalog"
          value={summary.totalBooks}
          icon={Library}
        />
        <StatTile label="Members" value={summary.totalMembers} icon={Users} />
        <StatTile
          label="Pending members"
          value={summary.pendingMembers}
          icon={UserCog}
          tone={summary.pendingMembers > 0 ? 'text-warning-dark' : undefined}
          caption="awaiting approval"
        />
        <StatTile
          label="Active reservations"
          value={summary.activeReservations}
          icon={Bookmark}
        />
        <StatTile
          label="Revenue"
          value={`$${Number(summary.revenueTotal).toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart
          title="Rentals — last 14 days"
          data={summary.rentalsPerDay}
        />
        <StatusBreakdownChart
          title="Members by status"
          order={libraryMemberStatusSchema.options}
          labels={MEMBER_STATUS_LABELS}
          counts={memberStatusCounts}
        />
      </div>
    </div>
  );
}

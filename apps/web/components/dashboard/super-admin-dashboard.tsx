import { Building2, ClipboardList, Users } from 'lucide-react';
import { organizationStatusSchema } from '@repo/contracts';
import type { OrganizationSummaryResponse } from '@repo/contracts';
import { StatTile } from './stat-tile';
import { TrendChart } from './trend-chart';
import { StatusBreakdownChart } from './status-breakdown-chart';
import { ORGANIZATION_STATUS_LABELS } from '@/lib/status-maps';

export function SuperAdminDashboard({
  summary,
}: {
  summary: OrganizationSummaryResponse;
}) {
  const statusCounts = Object.fromEntries(
    summary.statusBreakdown.map((row) => [row.status, row.count]),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Libraries"
          value={summary.totalOrganizations}
          icon={Building2}
        />
        <StatTile
          label="Pending approvals"
          value={summary.pendingApprovals}
          icon={ClipboardList}
          tone={summary.pendingApprovals > 0 ? 'text-warning-dark' : undefined}
          caption="awaiting review"
        />
        <StatTile label="Total users" value={summary.totalUsers} icon={Users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart
          title="New libraries — last 14 days"
          data={summary.organizationsPerDay}
        />
        <StatusBreakdownChart
          title="Libraries by status"
          order={organizationStatusSchema.options}
          labels={ORGANIZATION_STATUS_LABELS}
          counts={statusCounts}
        />
      </div>
    </div>
  );
}

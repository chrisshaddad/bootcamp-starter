'use client';

import {
  KeyRoundIcon,
  BuildingIcon,
  AlertTriangleIcon,
  UsersIcon,
  WrenchIcon,
  CreditCardIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiTile, OccupancyMeter, useMoney } from '@/components/dashboard/kpi-tile';
import { TimelineFeed } from '@/components/dashboard/timeline-feed';
import {
  useGetSubscriptionQuery,
  useCreatePortalSessionMutation,
} from '@/store/api/endpoints/billing.api';
import { useListUsersQuery } from '@/store/api/endpoints/users.api';
import {
  useGetReportSummaryQuery,
  useGetOverdueInvoicesQuery,
} from '@/store/api/endpoints/reports.api';
import { useListMaintenanceRequestsQuery } from '@/store/api/endpoints/maintenance-requests.api';
import { overdueOutstanding, maintenanceStats } from '@/lib/dashboard-kpis';
import type { MeResponse, SubscriptionStatus } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

function subscriptionStatusBadge(status: SubscriptionStatus | undefined) {
  if (!status) return null;
  const variants: Partial<
    Record<SubscriptionStatus, { label: string; className: string }>
  > = {
    ACTIVE: {
      label: 'Active',
      className: 'bg-emerald-500/15 text-emerald-600 border-emerald-200',
    },
    PAST_DUE: {
      label: 'Past due',
      className: 'bg-red-500/15 text-red-600 border-red-200',
    },
    CANCELED: {
      label: 'Canceled',
      className: 'bg-gray-500/15 text-gray-600 border-gray-200',
    },
    INCOMPLETE: {
      label: 'Incomplete',
      className: 'bg-yellow-500/15 text-yellow-700 border-yellow-200',
    },
    TRIALING: {
      label: 'Trial',
      className: 'bg-blue-500/15 text-blue-600 border-blue-200',
    },
    UNPAID: {
      label: 'Unpaid',
      className: 'bg-orange-500/15 text-orange-600 border-orange-200',
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-gray-400/15 text-gray-500 border-gray-200',
    },
  };
  const v = variants[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}

interface OrgAdminDashboardProps {
  me: MeResponse | null;
  locale: string;
  dict: Dictionary;
}

export function OrgAdminDashboard({ me, locale, dict }: OrgAdminDashboardProps) {
  const t = dict.dashboard;
  const k = t.kpi;
  const money = useMoney(locale);
  const base = `/${locale}/dashboard`;

  const { data: summary, isLoading: summaryLoading } = useGetReportSummaryQuery();
  const { data: overdue, isLoading: overdueLoading } =
    useGetOverdueInvoicesQuery();
  const { data: maintenance, isLoading: maintenanceLoading } =
    useListMaintenanceRequestsQuery();
  const { data: subscription, isLoading: subLoading } =
    useGetSubscriptionQuery();
  const { data: users, isLoading: usersLoading } = useListUsersQuery();
  const [createPortalSession, { isLoading: portalLoading }] =
    useCreatePortalSessionMutation();

  const userName = me?.user?.fullName ?? me?.user?.email ?? '';
  const overdueTotal = overdueOutstanding(overdue);
  const overdueCount = overdue?.length ?? 0;
  const netMtd = summary ? Number(summary.mtdNet) : 0;
  const openMaintenance = maintenanceStats(maintenance).active;

  async function handleManageBilling() {
    try {
      const result = await createPortalSession().unwrap();
      if (result?.url) window.location.href = result.url;
    } catch {
      // billing portal errors handled upstream
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.welcome}
          {userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{k.orgOverview}</p>
      </div>

      {/* Primary KPI row — live from reports + overdue */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={k.activeLeases}
          value={summary ? String(summary.activeLeases) : k.noData}
          icon={<KeyRoundIcon className="size-4" />}
          href={`${base}/leases`}
          loading={summaryLoading}
        />
        <KpiTile
          label={k.occupancy}
          value={summary ? `${summary.occupancyPct}%` : k.noData}
          icon={<BuildingIcon className="size-4" />}
          hint={
            summary
              ? `${summary.occupiedApartments} / ${summary.totalApartments} ${k.unitsOccupied}`
              : undefined
          }
          href={`${base}/reports`}
          loading={summaryLoading}
        >
          {summary && <OccupancyMeter pct={summary.occupancyPct} />}
        </KpiTile>
        <KpiTile
          label={k.netMtd}
          value={summary ? money.format(netMtd) : k.noData}
          tone={netMtd >= 0 ? 'positive' : 'negative'}
          icon={
            netMtd >= 0 ? (
              <TrendingUpIcon className="size-4" />
            ) : (
              <TrendingDownIcon className="size-4" />
            )
          }
          href={`${base}/reports`}
          loading={summaryLoading}
        />
        <KpiTile
          label={k.overdue}
          value={money.format(overdueTotal)}
          tone={overdueTotal > 0 ? 'negative' : 'neutral'}
          hint={`${overdueCount} ${k.invoicesPastDue}`}
          icon={<AlertTriangleIcon className="size-4" />}
          href={`${base}/invoices`}
          loading={overdueLoading}
        />
      </div>

      {/* Workspace row — team, maintenance, subscription */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label={k.teamMembers}
          value={users ? String(users.length) : k.noData}
          icon={<UsersIcon className="size-4" />}
          href={`${base}/users`}
          loading={usersLoading}
        />
        <KpiTile
          label={k.openMaintenance}
          value={maintenance ? String(openMaintenance) : k.noData}
          icon={<WrenchIcon className="size-4" />}
          href={`${base}/tasks`}
          loading={maintenanceLoading}
        />
        {/* Subscription card — carries an action, so not a plain link tile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCardIcon className="size-4 shrink-0" />
              <CardTitle className="text-xs font-medium uppercase tracking-wider">
                {t.status}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {subLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {subscriptionStatusBadge(subscription?.status)}
                {!subscription && (
                  <span className="text-sm text-muted-foreground">
                    {t.inactiveSub}
                  </span>
                )}
              </div>
            )}
            {!subLoading && subscription?.status === 'ACTIVE' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="w-fit"
              >
                {t.manageBilling}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t.recentActivity}</h2>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <TimelineFeed locale={locale} limit={8} dict={dict} />
        </div>
      </div>
    </div>
  );
}

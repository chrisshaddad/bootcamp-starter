'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  WrenchIcon,
  LoaderIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
} from 'lucide-react';
import { useListMaintenanceRequestsQuery } from '@/store/api/endpoints/maintenance-requests.api';
import { useListTimelineQuery } from '@/store/api/endpoints/timeline.api';
import { maintenanceStats, topActiveRequests } from '@/lib/dashboard-kpis';
import { KpiTile } from '@/components/dashboard/kpi-tile';
import type { MaintenanceRequestPriority, MeResponse } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface StaffDashboardProps {
  me: MeResponse | null;
  locale: string;
  role: string;
  dict: Dictionary;
}

function humanizeAction(action: string): string {
  const humanized = action.replace(/\./g, ' ');
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

const PRIORITY_CLASS: Record<MaintenanceRequestPriority, string> = {
  urgent: 'bg-red-500/15 text-red-600 border-red-200',
  high: 'bg-orange-500/15 text-orange-600 border-orange-200',
  medium: 'bg-blue-500/15 text-blue-600 border-blue-200',
  low: 'bg-gray-500/15 text-gray-600 border-gray-200',
};

export function StaffDashboard({ me, locale, dict }: StaffDashboardProps) {
  const t = dict.dashboard;
  const k = t.kpi;
  const dateLocale = locale === 'ar' ? ar : undefined;
  const base = `/${locale}/dashboard`;

  const { data: requests, isLoading: requestsLoading } =
    useListMaintenanceRequestsQuery();
  const { data: timelineData, isLoading: timelineLoading } =
    useListTimelineQuery({ limit: 5 });

  const stats = maintenanceStats(requests);
  const attention = topActiveRequests(requests, 5);
  const timelineEvents = timelineData?.data ?? [];
  const userName = me?.user?.fullName ?? '';

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.welcome}
          {userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{k.staffOverview}</p>
      </div>

      {/* KPI row — live from the maintenance-request list (building-scoped
          server-side; the one org-wide list both supervisor and maintenance
          can read). All tiles deep-link into the tasks module. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={k.openRequests}
          value={String(stats.open)}
          icon={<WrenchIcon className="size-4" />}
          href={`${base}/tasks`}
          loading={requestsLoading}
        />
        <KpiTile
          label={k.inProgress}
          value={String(stats.inProgress)}
          icon={<LoaderIcon className="size-4" />}
          href={`${base}/tasks`}
          loading={requestsLoading}
        />
        <KpiTile
          label={k.urgent}
          value={String(stats.activeUrgent)}
          tone={stats.activeUrgent > 0 ? 'negative' : 'neutral'}
          icon={<AlertTriangleIcon className="size-4" />}
          href={`${base}/tasks`}
          loading={requestsLoading}
        />
        <KpiTile
          label={k.resolved}
          value={String(stats.resolved)}
          tone={stats.resolved > 0 ? 'positive' : 'neutral'}
          icon={<CheckCircle2Icon className="size-4" />}
          href={`${base}/tasks`}
          loading={requestsLoading}
        />
      </div>

      {/* Needs attention — most-pressing active requests */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {k.needsAttention}
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          {requestsLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : attention.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {k.allCaughtUp}
            </p>
          ) : (
            <ul className="divide-y">
              {attention.map((req) => (
                <li key={req.id}>
                  <Link
                    href={`${base}/tasks`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {req.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {k.unit} {req.apartmentUnitNumber} · {req.renterName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={PRIORITY_CLASS[req.priority]}
                    >
                      {k.priority[req.priority]}
                    </Badge>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent activity */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.recentActivity}
        </h3>
        {timelineLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : timelineEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noActivity}</p>
        ) : (
          <div className="space-y-2">
            {timelineEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-4 border-b border-border/50 py-2 last:border-0"
              >
                <p className="text-sm">{humanizeAction(event.action)}</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

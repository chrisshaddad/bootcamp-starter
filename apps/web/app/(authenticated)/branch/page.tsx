'use client';

import {
  AlertTriangle,
  Clock,
  History,
  MessageSquare,
  PackageX,
} from 'lucide-react';
import type { AuditLogItem } from '@repo/contracts';
import { useBranchStats } from '@/hooks/use-branch-stats';
import { actionMeta, CATEGORY_META } from '@/lib/audit-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';

// Alert tiles. Rendered as plain cards (not links): the branch roles
// (PHARMACY_MANAGER / PHARMACY_EMPLOYEE) aren't in the Stock / Inquiries
// RoleGuards, so linking them there would only hit an access-denied page.
const ALERT_TILES = [
  {
    key: 'lowStock',
    label: 'Low stock',
    hint: 'medicines below threshold',
    icon: PackageX,
    iconClass: 'bg-error/10 text-error',
  },
  {
    key: 'nearExpiry',
    label: 'Near expiry',
    hint: 'batches expiring soon',
    icon: Clock,
    iconClass: 'bg-warning/15 text-warning-dark',
  },
  {
    key: 'openInquiries',
    label: 'Open inquiries',
    hint: 'awaiting a reply',
    icon: MessageSquare,
    iconClass: 'bg-primary-100 text-primary-hover',
  },
] as const;

function formatDateTime(value: AuditLogItem['createdAt']): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ActivityRow({ log }: { log: AuditLogItem }) {
  const meta = actionMeta(log.action);
  const category = CATEGORY_META[meta.category];
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${category.pill}`}
      >
        {category.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-900">{meta.label}</p>
        <p className="truncate text-xs text-gray-500">
          {log.userName ?? 'A former user'}
        </p>
      </div>
      <span className="shrink-0 text-xs text-gray-400">
        {formatDateTime(log.createdAt)}
      </span>
    </li>
  );
}

export default function BranchDashboardPage() {
  const { stats, isLoading, error, mutate } = useBranchStats();

  const value = (key: (typeof ALERT_TILES)[number]['key']): number =>
    stats ? stats[key] : 0;

  return (
    <div className="space-y-6">
      <div className={ENTER} style={enterStyle(0)}>
        <h1 className="text-2xl font-bold text-gray-900">Branch dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Stock alerts, open inquiries, and recent activity for your branch.
        </p>
      </div>

      {error ? (
        <Card className={`py-0 ${ENTER}`} style={enterStyle(70)}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load your dashboard
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching your branch stats. Please try
              again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ALERT_TILES.map((tile, index) => (
              <Card
                key={tile.key}
                className={`py-0 ${ENTER}`}
                style={enterStyle(70 + index * 70)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.iconClass}`}
                  >
                    <tile.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-500">
                      {tile.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-6 w-8" />
                    ) : (
                      <p className="text-xl font-semibold text-gray-900">
                        {value(tile.key)}
                      </p>
                    )}
                    <p className="truncate text-xs text-gray-400">
                      {tile.hint}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card
            className={`gap-0 overflow-hidden py-0 ${ENTER}`}
            style={enterStyle(300)}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <History className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">
                Recent activity
              </h2>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : !stats || stats.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <History className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  No recent activity at your branch yet.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentActivity.map((log) => (
                  <ActivityRow key={log.id} log={log} />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

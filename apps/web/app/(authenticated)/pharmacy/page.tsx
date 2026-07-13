'use client';

import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  History,
  MessageSquare,
  PackageX,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AuditLogItem, PharmacyBranchStat } from '@repo/contracts';
import { usePharmacyStats } from '@/hooks/use-pharmacy-stats';
import { usePharmacyAuditLogs } from '@/hooks/use-pharmacy-audit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { StatCard, type StatTone } from '@/components/dashboard/stat-card';
import {
  AttentionByBranchChart,
  AttentionLegend,
  StaffByBranchChart,
} from '@/components/dashboard/pharmacy-charts';
import { actionMeta, CATEGORY_META } from '@/lib/audit-format';
import { ENTER, enterStyle } from '@/lib/enter-animation';
import { cn } from '@/lib/utils';

const RECENT_ACTIVITY_COUNT = 7;

// Softer, filled-in card surface shared across every card/panel on the page.
const CARD_SURFACE = 'rounded-2xl border-transparent shadow-sm';

// Semantic icon-chip tints (design tokens from globals.css), so the chart
// panels speak the same visual language as the KPI tiles.
const TINT = {
  staff: 'bg-emerald-soft text-emerald-accent',
  attention: 'bg-warn-soft text-warn',
  activity: 'bg-purple/10 text-purple',
} as const;

// Headline KPI tiles. Each links into the console that owns the metric — all
// reachable by a PHARMACY_ADMIN. Tone drives the icon chip + accent colour.
const KPI_TILES: {
  key: 'branches' | 'employees' | 'openInquiries' | 'lowStock';
  label: string;
  href: string;
  icon: LucideIcon;
  tone: StatTone;
  hint: string;
}[] = [
  {
    key: 'branches',
    label: 'Branches',
    href: '/pharmacy/branches',
    icon: Building2,
    tone: 'brand',
    hint: 'active locations',
  },
  {
    key: 'employees',
    label: 'Employees',
    href: '/pharmacy/employees',
    icon: Users,
    tone: 'success',
    hint: 'across all branches',
  },
  {
    key: 'openInquiries',
    label: 'Open inquiries',
    href: '/inquiries',
    icon: MessageSquare,
    tone: 'warning',
    hint: 'awaiting response',
  },
  {
    key: 'lowStock',
    label: 'Low stock',
    href: '/stock',
    icon: PackageX,
    tone: 'critical',
    hint: 'below threshold',
  },
];

/**
 * Section wrapper: a fixed-height card with a header (tinted icon, title,
 * subtitle, optional inline action) and a flex-filled body so its chart always
 * fills the same footprint regardless of content.
 */
function PanelCard({
  title,
  subtitle,
  icon: Icon,
  tint,
  action,
  children,
  className,
  delayMs = 0,
  fill = false,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  tint: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  // Stretch to the grid row's height (matching neighbours) instead of forcing
  // a minimum — the body then scrolls if its content overflows.
  fill?: boolean;
}) {
  return (
    <Card
      className={cn(
        'flex flex-col py-0',
        fill ? 'h-full' : 'min-h-85',
        CARD_SURFACE,
        ENTER,
        className,
      )}
      style={enterStyle(delayMs)}
    >
      <CardContent className="flex min-h-0 flex-1 flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                tint,
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {subtitle ? (
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0 pt-1">{action}</div> : null}
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </CardContent>
    </Card>
  );
}

/** One fixed-height stat cell inside a branch card, for perfect row alignment. */
function StatCell({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex h-16 items-center gap-2 rounded-lg bg-gray-50 px-3">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function BranchCard({ branch }: { branch: PharmacyBranchStat }) {
  const attention = branch.openInquiries + branch.lowStock + branch.nearExpiry;
  const cells = [
    { label: 'Staff', value: branch.staff, icon: Users },
    {
      label: 'Open inquiries',
      value: branch.openInquiries,
      icon: MessageSquare,
    },
    { label: 'Low stock', value: branch.lowStock, icon: PackageX },
    { label: 'Near expiry', value: branch.nearExpiry, icon: Clock },
  ];
  return (
    <Link href="/pharmacy/branches" className="group block">
      <Card
        className={cn(
          'h-full overflow-hidden py-0 transition-shadow hover:shadow-md',
          CARD_SURFACE,
        )}
      >
        <div
          aria-hidden
          className={cn(
            'h-1 w-full',
            attention > 0 ? 'bg-warn-accent' : 'bg-primary-base',
          )}
        />
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
                <Building2 className="h-4 w-4" />
              </div>
              <p className="truncate font-semibold text-gray-900">
                {branch.name}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-primary-hover" />
          </div>
          <div className="mb-4">
            {attention > 0 ? (
              <StatusBadge variant="warning">
                <AlertTriangle />
                {attention} need{attention === 1 ? 's' : ''} attention
              </StatusBadge>
            ) : (
              <StatusBadge variant="success">
                <CheckCircle2 />
                All clear
              </StatusBadge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {cells.map((cell) => (
              <StatCell
                key={cell.label}
                icon={cell.icon}
                label={cell.label}
                value={cell.value}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Centered empty state that fills the panel body. */
function ChartPlaceholder({
  icon: Icon,
  title,
  description,
  iconClass = 'text-gray-300',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClass?: string;
}) {
  return (
    <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
      <Icon className={cn('mb-3 h-10 w-10', iconClass)} />
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-gray-500">{description}</p>
    </div>
  );
}

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
    <li className="flex items-start gap-3 py-3">
      <span
        className={cn(
          'mt-0.5 inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium',
          category.pill,
        )}
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

/** Pharmacy-wide audit feed — newest first, capped to the latest few. */
function RecentActivityPanel({ delayMs = 0 }: { delayMs?: number }) {
  const { logs, isLoading, error } = usePharmacyAuditLogs();
  const recent = logs?.slice(0, RECENT_ACTIVITY_COUNT);

  return (
    <PanelCard
      title="Recent activity"
      subtitle="Latest events across your pharmacy"
      icon={History}
      tint={TINT.activity}
      delayMs={delayMs}
      fill
      action={
        <Button asChild variant="ghost" size="sm">
          <Link href="/pharmacy/audit">
            View all
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <ul className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 py-3">
              <Skeleton className="h-5 w-14 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
          <AlertTriangle className="mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm text-gray-500">Couldn&apos;t load activity.</p>
        </div>
      ) : !recent || recent.length === 0 ? (
        <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
          <History className="mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm font-semibold text-gray-900">No activity yet</p>
          <p className="mt-1 max-w-xs text-xs text-gray-500">
            Actions across your branches — invites, stock changes, inquiries —
            will show up here.
          </p>
        </div>
      ) : (
        <ul className="thin-scroll h-full divide-y divide-border overflow-y-auto">
          {recent.map((log) => (
            <ActivityRow key={log.id} log={log} />
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

export default function PharmacyDashboardPage() {
  const { stats, isLoading, error, mutate } = usePharmacyStats();

  const perBranch = stats?.perBranch ?? [];
  const hasBranches = perBranch.length > 0;
  const nearExpiryTotal = perBranch.reduce((sum, b) => sum + b.nearExpiry, 0);
  const attentionTotal =
    (stats?.openInquiries ?? 0) + (stats?.lowStock ?? 0) + nearExpiryTotal;

  const value = (key: (typeof KPI_TILES)[number]['key']): number =>
    stats ? stats[key] : 0;

  const summary = stats
    ? `${stats.branches} branch${stats.branches === 1 ? '' : 'es'} · ${stats.employees} staff · ${attentionTotal} item${attentionTotal === 1 ? ' needs' : 's need'} attention`
    : 'Loading your pharmacy overview…';

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-3',
          ENTER,
        )}
        style={enterStyle(0)}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">{summary}</p>
        </div>
        {stats && !error ? (
          <StatusBadge variant="success" className="mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live data
          </StatusBadge>
        ) : null}
      </div>

      {error ? (
        <Card
          className={cn('py-0', CARD_SURFACE, ENTER)}
          style={enterStyle(70)}
        >
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load your dashboard
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching your stats. Please try again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {KPI_TILES.map((tile, index) => (
              <StatCard
                key={tile.key}
                label={tile.label}
                value={value(tile.key)}
                icon={tile.icon}
                tone={tile.tone}
                href={tile.href}
                hint={tile.hint}
                isLoading={isLoading}
                delayMs={70 + index * 70}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <PanelCard
              title="Attention by branch"
              subtitle="Open inquiries, low stock & near-expiry per branch"
              icon={Activity}
              tint={TINT.attention}
              className="lg:col-span-2"
              delayMs={360}
              action={
                hasBranches && !isLoading ? (
                  <div className="hidden sm:block">
                    <AttentionLegend />
                  </div>
                ) : null
              }
            >
              {isLoading ? (
                <Skeleton className="h-full min-h-60 w-full rounded-lg" />
              ) : !hasBranches ? (
                <ChartPlaceholder
                  icon={Building2}
                  title="No branches yet"
                  description="Add a branch to start tracking stock and inquiries across your pharmacy."
                />
              ) : (
                <AttentionByBranchChart branches={perBranch} />
              )}
            </PanelCard>

            <PanelCard
              title="Staff by branch"
              subtitle="Headcount across your locations"
              icon={Users}
              tint={TINT.staff}
              delayMs={430}
            >
              {isLoading ? (
                <Skeleton className="h-full min-h-60 w-full rounded-lg" />
              ) : !hasBranches ? (
                <ChartPlaceholder
                  icon={Users}
                  title="No staff yet"
                  description="Invite employees and assign them to a branch to see the breakdown."
                />
              ) : (
                <StaffByBranchChart branches={perBranch} />
              )}
            </PanelCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={cn('lg:col-span-2', ENTER)} style={enterStyle(500)}>
              <div className="mb-4 flex h-9 items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Branches
                </h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/pharmacy/branches">
                    Manage
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-56 w-full rounded-2xl" />
                  ))}
                </div>
              ) : !hasBranches ? (
                <Card className={cn('py-0', CARD_SURFACE)}>
                  <CardContent className="flex flex-col items-center justify-center py-14">
                    <Building2 className="mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      No branches yet
                    </h3>
                    <p className="mb-4 max-w-md text-center text-sm text-gray-500">
                      Add your first branch to start assigning staff and stock.
                    </p>
                    <Button asChild>
                      <Link href="/pharmacy/branches">Go to branches</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {perBranch.map((branch) => (
                    <BranchCard key={branch.branchId} branch={branch} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col lg:col-span-1">
              {/* Spacer mirroring the "Branches" heading so the card tops align. */}
              <div className="mb-4 hidden h-9 lg:block" aria-hidden />
              {/* On desktop the panel is absolutely positioned inside this cell
                  so its (scrolling) content never inflates the grid row — the
                  row height is driven solely by the branch cards, and the panel
                  fills it and scrolls. On mobile it flows naturally. */}
              <div className="relative min-h-60 flex-1">
                <div className="lg:absolute lg:inset-0">
                  <RecentActivityPanel delayMs={560} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

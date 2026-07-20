'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Building2,
  Settings,
  Loader2,
  ArrowRight,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-auth';
import { useDashboard, useUpdateGymSettings } from '@/hooks/use-dashboard';
import { ApiError } from '@/lib/api';
import { AnalyticsPanels } from './analytics-panels';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

/** A single stat card with icon, value, and label. Optionally links elsewhere. */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-primary-base',
  href,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  href?: string;
  hint?: string;
}) {
  const card = (
    <Card
      className={
        href
          ? 'h-full transition-colors hover:border-primary-base/40'
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold text-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        {hint && (
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-base">
            {hint} <ArrowRight className="h-3 w-3" />
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base"
    >
      {card}
    </Link>
  );
}

/** Capacity progress bar card */
function CapacityCard({
  current,
  max,
  onEditClick,
}: {
  current: number;
  max: number | null;
  onEditClick: () => void;
}) {
  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : null;
  const isNearFull = pct !== null && pct >= 80;
  const isFull = pct !== null && pct >= 100;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Live Capacity
        </CardTitle>
        <Building2
          className={`h-5 w-5 ${isFull ? 'text-destructive' : isNearFull ? 'text-warning-dark' : 'text-primary-base'}`}
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-foreground">
            {current}
          </span>
          {max !== null && (
            <span className="text-lg font-medium text-muted-foreground">
              / {max}
            </span>
          )}
        </div>
        {max !== null && pct !== null ? (
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full transition-all ${
                  isFull
                    ? 'bg-destructive'
                    : isNearFull
                      ? 'bg-warning-dark'
                      : 'bg-primary-base'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pct}% capacity used
              {isFull && (
                <span className="ml-1 font-semibold text-destructive">
                  . Gym is full!
                </span>
              )}
              {isNearFull && !isFull && (
                <span className="ml-1 font-semibold text-warning-dark">
                  . Near capacity
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No capacity limit set.{' '}
            <button
              type="button"
              onClick={onEditClick}
              className="text-primary-base underline hover:no-underline"
            >
              Set one in settings
            </button>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Inline "needs attention" panel for memberships expiring within 30 days.
 * Lives on the dashboard itself (no modal) so it reads like a task list:
 * soonest-expiring first, each row jumps straight to that member's profile.
 */
function ExpiringSoonPanel({
  items,
}: {
  items: {
    memberId: string;
    memberName: string;
    subscriptionId: string;
    planName: string | null;
    endDate: Date | string;
  }[];
}) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <Bell className="h-4 w-4 text-warning-dark" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Needs Attention
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Memberships expiring within 30 days
            </p>
          </div>
        </div>
        {sorted.length > 0 && (
          <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning-dark">
            {sorted.length}
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm text-muted-foreground">
              All caught up. No memberships expiring soon.
            </p>
          </div>
        ) : (
          <ul className="-mx-2 max-h-80 space-y-0.5 overflow-y-auto overscroll-contain">
            {sorted.map((item) => {
              const daysLeft = differenceInDays(
                new Date(item.endDate),
                new Date(),
              );
              const urgent = daysLeft <= 7;
              return (
                <li key={item.subscriptionId}>
                  <Link
                    href={`/members/${item.memberId}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                      {item.memberName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {item.memberName}
                      </span>
                      {item.planName && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.planName}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        urgent
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/10 text-warning-dark'
                      }`}
                    >
                      {daysLeft <= 0 ? 'Expires today' : `${daysLeft}d left`}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                      {format(new Date(item.endDate), 'MMM d')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Inline settings panel for maxCapacity */
function SettingsPanel({
  currentMax,
  onSave,
  onClose,
}: {
  currentMax: number | null;
  onSave: (v: number | null) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(
    currentMax !== null ? String(currentMax) : '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = value.trim() === '' ? null : parseInt(value, 10);
    if (parsed !== null && parsed < 0) return;
    setSaving(true);
    try {
      await onSave(parsed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary-base bg-primary-100/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Settings className="h-4 w-4 text-primary-base" />
          Gym Settings: Max Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="flex-1">
          <label
            htmlFor="maxCapacity"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Maximum building capacity (leave blank for no limit)
          </label>
          <Input
            id="maxCapacity"
            type="number"
            min={0}
            placeholder="e.g. 50"
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              // Prevent negative values
              if (raw !== '' && parseInt(raw, 10) < 0) return;
              setValue(raw);
            }}
            className="w-full"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-base text-white hover:bg-primary-base/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading: isLoadingUser } = useUser();
  const { stats, isLoading: isLoadingStats, mutate } = useDashboard();
  const { updateMaxCapacity } = useUpdateGymSettings();
  const [showSettings, setShowSettings] = useState(false);

  const isLoading = isLoadingUser || isLoadingStats;

  if (isLoading) return <DashboardSkeleton />;

  const handleSaveCapacity = async (value: number | null) => {
    try {
      await updateMaxCapacity(value);
      toast.success('Capacity setting saved');
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save settings',
      );
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back,{' '}
            {user?.name || user?.email?.split('@')[0] || 'Manager'}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at your gym today.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings((p) => !p)}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary"
        >
          <Settings className="h-4 w-4" />
          Manage Max Capacity
        </Button>
      </div>

      {/* Inline settings panel */}
      {showSettings && (
        <SettingsPanel
          currentMax={stats?.maxCapacity ?? null}
          onSave={handleSaveCapacity}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Stat cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Members"
          value={stats?.totalMembers ?? 0}
          sub="All registered members"
        />
        <StatCard
          icon={UserCheck}
          label="Active Members"
          value={stats?.totalActiveMembers ?? 0}
          sub="With an active subscription"
          color="text-success"
          href="/members?activeSubscription=true"
          hint="View members"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expiring Soon"
          value={stats?.expiringSoon.length ?? 0}
          sub="Subscriptions expiring in 30 days"
          color={
            (stats?.expiringSoon.length ?? 0) > 0
              ? 'text-warning-dark'
              : 'text-muted-foreground/40'
          }
        />
        <CapacityCard
          current={stats?.currentOccupancy ?? 0}
          max={stats?.maxCapacity ?? null}
          onEditClick={() => setShowSettings(true)}
        />
      </div>

      {/* Left: trend + plan-mix analytics (wider column — charts need the room).
          Right: actionable "needs attention" rail (replaces the old popup for
          expiring memberships) — same place a reader expects an action feed. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AnalyticsPanels
            checkInTrend={stats?.checkInTrend ?? []}
            subscriptionsByPlan={stats?.subscriptionsByPlan ?? []}
          />
        </div>
        <div className="lg:col-span-2">
          <ExpiringSoonPanel items={stats?.expiringSoon ?? []} />
        </div>
      </div>
    </div>
  );
}

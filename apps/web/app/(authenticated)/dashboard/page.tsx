'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Building2,
  Settings,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useUser } from '@/hooks/use-auth';
import { useDashboard, useUpdateGymSettings } from '@/hooks/use-dashboard';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { ApiError } from '@/lib/api';
import { AnimatedCounter } from '@/components/animated-counter';
import Link from 'next/link';

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

/**
 * Dialog trigger + scrollable list, shared by the Active Members and
 * Expiring Soon cards. The list body scrolls independently of the header so
 * arbitrarily long lists never push the dialog past the viewport.
 */
function ListDialog({
  triggerLabel,
  title,
  description,
  itemCount,
  emptyMessage,
  triggerClassName,
  children,
}: {
  triggerLabel: React.ReactNode;
  title: string;
  description?: string;
  itemCount: number;
  emptyMessage: string;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            triggerClassName || 'text-primary-base hover:underline'
          }`}
        >
          <ChevronDown className="h-3.5 w-3.5" /> {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="-mx-6 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          {itemCount === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              {emptyMessage}
            </p>
          ) : (
            children
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A single stat card with icon, value, and label */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-primary-base',
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="glass-card card-elevated rounded-xl border-border bg-card">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        {typeof value === 'number' ? (
          <AnimatedCounter value={value} className="text-3xl font-extrabold text-foreground" />
        ) : (
          <p className="text-3xl font-extrabold text-foreground">{value}</p>
        )}
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ActiveMembersCard({
  count,
  items,
}: {
  count: number;
  items: { memberId: string; memberName: string }[];
}) {
  return (
    <Card className="glass-card card-elevated rounded-xl border-border bg-card">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Active Members
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <UserCheck className="h-5 w-5 text-green-600" />
        </div>
      </CardHeader>
      <CardContent>
        <AnimatedCounter value={count} className="text-3xl font-extrabold text-foreground" />
        <p className="mt-1 text-xs text-muted-foreground">
          With an active subscription
        </p>
        {items.length > 0 && (
          <ListDialog
            triggerLabel="Show list"
            triggerClassName="bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
            title={`Active Members (${items.length})`}
            description="Members with an active subscription."
            itemCount={items.length}
            emptyMessage="No active members."
          >
            <ul className="space-y-1.5 py-1">
              {items.map((item) => (
                <li
                  key={item.memberId}
                  className="flex items-center rounded-md bg-green-50 px-2 py-1.5 text-xs font-medium wrap-break-word text-foreground dark:bg-green-900/30 dark:text-green-300"
                >
                  {item.memberName}
                </li>
              ))}
            </ul>
          </ListDialog>
        )}
      </CardContent>
    </Card>
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
    <Card className="glass-card card-elevated rounded-xl border-border bg-card">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Live Capacity
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
          <Building2
            className={`h-5 w-5 ${isFull ? 'text-red-500' : isNearFull ? 'text-amber-500' : 'text-primary-base'}`}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <AnimatedCounter value={current} className="text-3xl font-extrabold text-foreground" />
          {max !== null && (
            <span className="text-lg font-medium text-muted-foreground">/ {max}</span>
          )}
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Members currently checked inside gym
        </p>
        {max !== null && pct !== null ? (
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-2 rounded-full transition-all ${
                  isFull
                    ? 'bg-red-500'
                    : isNearFull
                      ? 'bg-amber-500'
                      : 'bg-primary-base'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pct}% capacity used
              {isFull && (
                <span className="ml-1 font-semibold text-red-600 dark:text-red-400">
                  — Gym is full!
                </span>
              )}
              {isNearFull && !isFull && (
                <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">
                  — Near capacity
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

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

/** Expiring-soon list */
function ExpiringSoonCard({
  count,
  items,
}: {
  count: number;
  items: {
    memberId: string;
    memberName: string;
    subscriptionId: string;
    endDate: Date | string;
  }[];
}) {
  return (
    <Card className="glass-card card-elevated rounded-xl relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
      <div className="pl-2">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Expiring Soon
          </CardTitle>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
        </CardHeader>
        <CardContent>
          <AnimatedCounter value={count} className="text-3xl font-extrabold text-foreground" />
          <p className="mt-1 text-xs text-muted-foreground">
            subscriptions expiring in 30 days
          </p>
          {items.length > 0 && (
            <ListDialog
              triggerLabel={`View ${items.length} expiring`}
              triggerClassName="bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
              title={`Expiring Soon (${items.length})`}
              description="Active subscriptions ending within 30 days."
              itemCount={items.length}
              emptyMessage="No subscriptions expiring soon."
            >
              <ul className="space-y-2 py-1">
                {items.map((item) => {
                  const daysLeft = differenceInDays(
                    new Date(item.endDate),
                    new Date(),
                  );
                  return (
                    <li
                      key={item.subscriptionId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          {getInitials(item.memberName)}
                        </div>
                        <span className="min-w-0 truncate font-medium text-foreground text-sm">
                          {item.memberName}
                        </span>
                      </div>
                      <span className={`badge-pill shrink-0 ${daysLeft <= 7 ? 'badge-expired' : 'badge-cancelled'}`}>
                        {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ListDialog>
          )}
        </CardContent>
      </div>
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
    <Card className="border-primary-base bg-card shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Settings className="h-4 w-4 text-primary-base" />
          Gym Settings — Max Capacity
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
            className="w-full border-border bg-background text-foreground"
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

/** Recent Activity Card */
function RecentActivityCard() {
  const { auditLogs, isLoading } = useAuditLogs({ limit: 5 });

  const formatActionShort = (action: string) => {
    return action.toLowerCase().replace(/_/g, ' ');
  };

  const getActionDotColor = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATE')) return 'bg-green-500';
    if (a.includes('UPDATE')) return 'bg-blue-500';
    if (a.includes('CANCEL') || a.includes('DELETE')) return 'bg-red-500';
    if (a.includes('DEACTIVATE')) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  const formatRelativeTime = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="glass-card card-elevated rounded-xl border-border bg-card">
      <CardHeader className="pb-4 flex-row items-center justify-between space-y-0 border-b border-border/50">
        <CardTitle className="text-lg font-bold text-foreground">
          Recent Activity
        </CardTitle>
        <Link href="/audit-logs" className="text-sm font-medium text-primary-base hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !auditLogs || auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet
          </p>
        ) : (
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${getActionDotColor(log.action)}`} />
                <p className="flex-1 text-sm text-foreground truncate">
                  <span className="font-semibold">{log.userName || 'System'}</span>
                  {' '}{formatActionShort(log.action)}
                  {log.entityName && <span className="text-muted-foreground"> — {log.entityName}</span>}
                </p>
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {formatRelativeTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
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

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Good {timeOfDay},{' '}
            {user?.profile?.firstName ||
              user?.name?.split(' ')[0] ||
              user?.email?.split('@')[0] ||
              'there'}
            ! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at your gym today.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings((p) => !p)}
          className="flex items-center gap-2 border-border text-muted-foreground hover:border-primary-base hover:text-primary-base"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <StatCard
          icon={Users}
          label="Total Members"
          value={stats?.totalMembers ?? 0}
          sub="All registered members"
        />
        <ActiveMembersCard
          count={stats?.totalActiveMembers ?? 0}
          items={stats?.activeMembersList ?? []}
        />
        <ExpiringSoonCard
          count={stats?.expiringSoon.length ?? 0}
          items={stats?.expiringSoon ?? []}
        />
        <CapacityCard
          current={stats?.currentOccupancy ?? 0}
          max={stats?.maxCapacity ?? null}
          onEditClick={() => setShowSettings(true)}
        />
      </div>

      {/* Activity feed row */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 animate-stagger">
        <RecentActivityCard />
      </div>
    </div>
  );
}

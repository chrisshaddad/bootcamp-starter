'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Building2,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-auth';
import { useDashboard, useUpdateGymSettings } from '@/hooks/use-dashboard';
import { ApiError } from '@/lib/api';

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
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">
          {label}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold text-gray-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
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
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">
          Active Members
        </CardTitle>
        <UserCheck className="h-5 w-5 text-green-600" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold text-gray-900">{count}</p>
        <p className="mt-1 text-xs text-gray-400">
          With an active subscription
        </p>
        {count > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-base hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide list
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show list
              </>
            )}
          </button>
        )}
        {expanded && (
          <ul className="mt-2 space-y-1.5">
            {items.map((item) => (
              <li
                key={item.memberId}
                className="flex items-center rounded-md bg-green-50 px-2 py-1.5 text-xs font-medium text-gray-800"
              >
                {item.memberName}
              </li>
            ))}
          </ul>
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
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">
          Live Capacity
        </CardTitle>
        <Building2
          className={`h-5 w-5 ${isFull ? 'text-red-500' : isNearFull ? 'text-amber-500' : 'text-primary-base'}`}
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-gray-900">
            {current}
          </span>
          {max !== null && (
            <span className="text-lg font-medium text-gray-400">/ {max}</span>
          )}
        </div>
        {max !== null && pct !== null ? (
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-gray-100">
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
            <p className="mt-1 text-xs text-gray-400">
              {pct}% capacity used
              {isFull && (
                <span className="ml-1 font-semibold text-red-600">
                  — Gym is full!
                </span>
              )}
              {isNearFull && !isFull && (
                <span className="ml-1 font-semibold text-amber-600">
                  — Near capacity
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-400">
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

/** Expiring-soon collapsible list */
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
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">
          Expiring Soon
        </CardTitle>
        <AlertTriangle
          className={`h-5 w-5 ${count > 0 ? 'text-amber-500' : 'text-gray-300'}`}
        />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold text-gray-900">{count}</p>
        <p className="mt-1 text-xs text-gray-400">
          subscriptions expiring in 30 days
        </p>
        {count > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-base hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide list
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show list
              </>
            )}
          </button>
        )}
        {expanded && (
          <ul className="mt-2 space-y-1.5">
            {items.map((item) => {
              const daysLeft = differenceInDays(
                new Date(item.endDate),
                new Date(),
              );
              return (
                <li
                  key={item.subscriptionId}
                  className="flex items-center justify-between rounded-md bg-amber-50 px-2 py-1.5 text-xs"
                >
                  <span className="font-medium text-gray-800">
                    {item.memberName}
                  </span>
                  <span
                    className={`font-semibold ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-700'}`}
                  >
                    {daysLeft <= 0
                      ? 'Expires today'
                      : `${daysLeft}d left — ${format(new Date(item.endDate), 'MMM d')}`}
                  </span>
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
    <Card className="border-primary-base bg-primary-100/10 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Settings className="h-4 w-4 text-primary-base" />
          Gym Settings — Max Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="flex-1">
          <label
            htmlFor="maxCapacity"
            className="mb-1 block text-xs font-medium text-gray-600"
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
            className="w-full border-gray-300"
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
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back,{' '}
            {user?.profile?.firstName ||
              user?.name ||
              user?.email?.split('@')[0] ||
              'Manager'}
            !
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening at your gym today.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings((p) => !p)}
          className="flex items-center gap-2 border-gray-200 text-gray-600 hover:border-primary-base hover:text-primary-base"
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
    </div>
  );
}

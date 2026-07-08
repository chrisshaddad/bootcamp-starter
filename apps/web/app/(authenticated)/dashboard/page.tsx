'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/use-auth';
import { useMedicines } from '@/hooks/use-medicines';
import { useUsers } from '@/hooks/use-users';
import { usePharmacies } from '@/hooks/use-pharmacies';
import { usePlatformStats } from '@/hooks/use-platform-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  ClipboardList,
  GitBranch,
  Minus,
  Pill,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

const quickActions = [
  {
    title: 'Add User',
    href: '/admin/users',
    description: 'Invite staff and admins',
  },
  {
    title: 'Add Pharmacy',
    href: '/admin/pharmacies',
    description: 'Register a new pharmacy',
  },
  {
    title: 'Add Medicine',
    href: '/admin/medicines',
    description: 'Expand the shared catalog',
  },
  {
    title: 'View Audit Logs',
    href: '/admin/audit',
    description: 'Review platform activity',
  },
];

// ---------------------------------------------------------------------------
// Shared, single-source-of-truth styling so every card/row is identical.
// ---------------------------------------------------------------------------

// Every card: 12px radius, subtle shadow, 150ms transition, gentle hover lift.
// Padding (24px) comes from the shadcn Card (py-6) + CardContent/Header (px-6).
const CARD_CLASS =
  'rounded-2xl border-gray-200 bg-white shadow-sm transition-all duration-150 ease-in-out hover:shadow-md';

// Every interactive inner row: 8px radius, pointer, green hover wash, lift, and
// a soft shadow — one behavior applied everywhere, no per-row variation.
const ROW_INTERACTIVE =
  'cursor-pointer rounded-xl transition-all duration-150 ease-in-out hover:-translate-y-px hover:bg-hover-tint hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]';

// Non-interactive inner tile (stats, gauges): 8px radius, no hover.
const INNER_TILE = 'rounded-xl bg-gray-50 p-4';

// Rotating green tones for the stat-card icon chips (mint → emerald → sage →
// forest) and the matching category accent bar under each stat number.
const ICON_TONES = [
  'bg-mint-soft text-mint',
  'bg-emerald-soft text-emerald-accent',
  'bg-sage-soft text-sage',
  'bg-forest-soft text-forest',
];
const ACCENT_BARS = [
  'bg-mint',
  'bg-emerald-accent',
  'bg-sage',
  'bg-forest',
];

// Green-forward gradient fills for the catalog-health bars, amber for warnings.
const BAR_GRADIENTS: Record<string, string> = {
  'Priced medicines': 'bg-gradient-to-r from-primary-400 to-forest',
  'Barcode coverage': 'bg-gradient-to-r from-mint to-emerald-accent',
  'Unpriced entries': 'bg-gradient-to-r from-warn-accent to-warn',
};

// Shared entrance animation; callers stagger via an inline animationDelay.
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500';

// Row grids: CSS Grid, auto-fit + minmax so columns are equal and stretch to
// the same height. 12px gap between cards; rows are spaced 16px by the parent.
const STAT_GRID =
  'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-stretch gap-3';
const DUO_GRID =
  'grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-stretch gap-3';

function enterStyle(delayMs: number) {
  return { animationDelay: `${delayMs}ms`, animationFillMode: 'backwards' as const };
}

function formatCount(value?: number | null) {
  if (value == null) return '—';
  return value.toLocaleString();
}

export function DashboardContent() {
  const { user, isLoading: isUserLoading } = useUser();
  const { users, isLoading: isUsersLoading } = useUsers();
  const { stats: platformStats, isLoading: isStatsLoading } =
    usePlatformStats();
  const { medicines, isLoading: isMedicinesLoading } = useMedicines({
    pageSize: 25,
  });
  const { pharmacies, isLoading: isPharmaciesLoading } = usePharmacies();

  const isLoading =
    isUserLoading ||
    isUsersLoading ||
    isStatsLoading ||
    isMedicinesLoading ||
    isPharmaciesLoading;

  // The dashboard KPIs come from one authoritative source (`/stats/platform`):
  // real, unscoped totals plus genuine trailing-7-day growth deltas.
  const statusCounts = {
    active: platformStats?.users.active ?? 0,
    pending: platformStats?.users.pending ?? 0,
    inactive: platformStats?.users.inactive ?? 0,
    suspended: platformStats?.users.suspended ?? 0,
  };
  const userTotal = platformStats?.users.total ?? 0;
  const pharmacyCount = platformStats?.pharmacies.total ?? 0;
  const pharmaciesWithBranch = platformStats?.pharmacies.withBranch ?? 0;
  const totalBranches = platformStats?.branches.total ?? 0;
  const totalMedicines = platformStats?.medicines.total ?? 0;
  const pricedMedicines = platformStats?.medicines.priced ?? 0;
  const barcodedMedicines = platformStats?.medicines.withBarcode ?? 0;
  const unpricedMedicines = Math.max(totalMedicines - pricedMedicines, 0);
  const barcodeCoverage =
    totalMedicines > 0
      ? Math.round((barcodedMedicines / totalMedicines) * 100)
      : 0;
  const pricingCoverage =
    totalMedicines > 0
      ? Math.round((pricedMedicines / totalMedicines) * 100)
      : 0;

  const stockAlerts = (medicines ?? [])
    .filter((medicine) => !medicine.priceLbp || !medicine.barcode)
    .slice(0, 4)
    .map((medicine) => {
      const missingFields: string[] = [];
      if (!medicine.priceLbp) missingFields.push('price');
      if (!medicine.barcode) missingFields.push('barcode');

      const severity =
        missingFields.length === 2
          ? 'Needs review'
          : missingFields.includes('price')
            ? 'Pricing missing'
            : 'Barcode missing';

      return {
        name: medicine.brandName,
        severity,
        detail: `Missing ${missingFields.join(' and ')}`,
      };
    });

  const pharmacyBreakdown = (pharmacies ?? []).map((pharmacy) => {
    const userCount =
      users?.filter((user) => user.pharmacyId === pharmacy.id).length ?? 0;

    return {
      name: pharmacy.name,
      userCount,
    };
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className={STAT_GRID}>
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const overviewStats = [
    {
      label: 'Total Users',
      value: formatCount(userTotal),
      icon: Users,
      trend: `${statusCounts.active} active • ${statusCounts.pending} pending`,
      newThisWeek: platformStats?.users.newThisWeek,
    },
    {
      label: 'Total Pharmacies',
      value: formatCount(pharmacyCount),
      icon: Building2,
      trend: 'Registered pharmacies in the current catalog',
      newThisWeek: platformStats?.pharmacies.newThisWeek,
    },
    {
      label: 'Total Medicines',
      value: formatCount(totalMedicines),
      icon: Pill,
      trend: `${pricedMedicines} priced • ${barcodedMedicines} barcoded`,
      newThisWeek: platformStats?.medicines.newThisWeek,
    },
    {
      // A ratio has no meaningful "created this week" count, so this card omits
      // the growth delta (undefined) rather than inventing one.
      label: 'Catalog Coverage',
      value: `${pricingCoverage}%`,
      icon: Boxes,
      trend: `${barcodeCoverage}% have a barcode`,
      newThisWeek: undefined,
    },
  ];

  const catalogBars = [
    { label: 'Priced medicines', value: pricingCoverage },
    { label: 'Barcode coverage', value: barcodeCoverage },
    {
      label: 'Unpriced entries',
      value:
        totalMedicines > 0
          ? Math.round((unpricedMedicines / totalMedicines) * 100)
          : 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-base">
            Pharmacy Operations
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome back,{' '}
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.firstName ||
              user?.email?.split('@')[0] ||
              'Admin'}
            .
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            A live overview of your platform users, pharmacies, and medicine
            catalog.
          </p>
        </div>
        <Badge
          variant="success"
          className="gap-2 px-3 py-1.5 text-sm text-gray-700"
        >
          <ShieldCheck className="text-primary-base" />
          Live data synced
        </Badge>
      </div>

      {/* Stat cards */}
      <div className={STAT_GRID}>
        {overviewStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`${CARD_CLASS} ${ENTER}`}
              style={enterStyle(index * 70)}
            >
              <CardContent className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                      {stat.value}
                    </p>
                    <div
                      className={`mt-2 h-1 w-10 rounded-full ${ACCENT_BARS[index % ACCENT_BARS.length]}`}
                    />
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${ICON_TONES[index % ICON_TONES.length]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">{stat.trend}</p>
                  {stat.newThisWeek !== undefined && (
                    <p
                      className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                        stat.newThisWeek > 0 ? 'text-forest' : 'text-gray-400'
                      }`}
                    >
                      {stat.newThisWeek > 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                      {stat.newThisWeek > 0
                        ? `+${stat.newThisWeek.toLocaleString()} this week`
                        : 'No new this week'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Catalog health + Quick Actions */}
      <div className={DUO_GRID}>
        <Card className={`${CARD_CLASS} ${ENTER}`} style={enterStyle(300)}>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Catalog health
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            {catalogBars.map((item) => (
              <div key={item.label} className={INNER_TILE}>
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-700">
                  <span>{item.label}</span>
                  <span className="tabular-nums">{item.value}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-xl bg-gray-200">
                  <div
                    className={`h-2.5 rounded-xl transition-all duration-500 ease-out ${BAR_GRADIENTS[item.label]}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={`${CARD_CLASS} ${ENTER}`} style={enterStyle(360)}>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={`group flex items-center justify-between border border-gray-200 p-4 hover:border-primary-300 ${ROW_INTERACTIVE}`}
              >
                <div>
                  <p className="font-semibold text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-base" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alert highlight + Pharmacy breakdown */}
      <div className={DUO_GRID}>
        <Card
          className={`${CARD_CLASS} ${ENTER} border-l-4 border-l-warn-accent bg-[rgba(245,158,11,0.04)]`}
          style={enterStyle(420)}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-900">
              Medicines missing catalog data
            </CardTitle>
            <Badge variant="warning">Watchlist</Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            {stockAlerts.length > 0 ? (
              stockAlerts.map((alert) => (
                <div
                  key={alert.name}
                  className={`flex items-start justify-between gap-3 border border-gray-200 bg-white p-4 hover:border-primary-300 ${ROW_INTERACTIVE}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">
                      {alert.name}
                    </p>
                    <p className="text-sm text-gray-500">{alert.detail}</p>
                  </div>
                  <Badge
                    variant={
                      alert.severity === 'Needs review' ? 'critical' : 'warning'
                    }
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Every medicine has price and barcode data.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${CARD_CLASS} ${ENTER}`} style={enterStyle(480)}>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Pharmacy breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            {pharmacyBreakdown.length > 0 ? (
              pharmacyBreakdown.map((pharmacy) => (
                <div
                  key={pharmacy.name}
                  className={`flex items-center justify-between gap-3 border border-gray-200 bg-white p-4 hover:border-primary-300 ${ROW_INTERACTIVE}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-base">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <p className="truncate font-semibold text-gray-900">
                      {pharmacy.name}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Users className="h-3.5 w-3.5" />
                    {pharmacy.userCount} linked{' '}
                    {pharmacy.userCount === 1 ? 'user' : 'users'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Pharmacies will appear here as soon as they are registered.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform health + Operational snapshot */}
      <div className={DUO_GRID}>
        <Card className={`${CARD_CLASS} ${ENTER}`} style={enterStyle(540)}>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Platform health
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="grid flex-1 grid-cols-2 gap-3">
              {[
                { label: 'Active users', value: statusCounts.active },
                { label: 'Pending invites', value: statusCounts.pending },
                { label: 'Inactive accounts', value: statusCounts.inactive },
                { label: 'Suspended users', value: statusCounts.suspended },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className={`flex flex-col justify-center ${INNER_TILE}`}
                >
                  <p className="text-sm text-gray-500">{tile.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {tile.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`${CARD_CLASS} ${ENTER}`} style={enterStyle(600)}>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">
              Operational snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            {[
              {
                icon: TrendingUp,
                label: 'Pharmacies onboarded',
                value: formatCount(pharmacyCount),
              },
              {
                icon: Building2,
                label: 'Pharmacies with a branch',
                value: `${pharmaciesWithBranch} of ${pharmacyCount}`,
              },
              {
                icon: GitBranch,
                label: 'Total branches',
                value: formatCount(totalBranches),
              },
              {
                icon: ClipboardList,
                label: 'Users tracked',
                value: formatCount(userTotal),
              },
              {
                icon: Pill,
                label: 'Medicines in catalog',
                value: formatCount(totalMedicines),
              },
            ].map((row) => {
              const RowIcon = row.icon;
              return (
                <div
                  key={row.label}
                  className={`flex items-center justify-between ${INNER_TILE}`}
                >
                  <div className="flex items-center gap-2">
                    <RowIcon className="h-4 w-4 text-primary-base" />
                    <span className="text-sm text-gray-600">{row.label}</span>
                  </div>
                  <span className="font-bold text-gray-900">{row.value}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}

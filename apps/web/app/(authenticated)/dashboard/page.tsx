'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useUser } from '@/hooks/use-auth';
import { useMedicines } from '@/hooks/use-medicines';
import { useUsers } from '@/hooks/use-users';
import { usePlatformStats } from '@/hooks/use-platform-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Boxes,
  Building2,
  ClipboardList,
  GitBranch,
  Pill,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { PharmacyListResponse } from '@repo/contracts';

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
  const { data: pharmaciesData, isLoading: isPharmaciesLoading } =
    useSWR<PharmacyListResponse>('/pharmacies');

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

  const pharmacyBreakdown = (pharmaciesData?.pharmacies ?? []).map(
    (pharmacy) => {
      const userCount =
        users?.filter((user) => user.pharmacyId === pharmacy.id).length ?? 0;

      return {
        name: pharmacy.name,
        userCount,
      };
    },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary-base">
            Pharmacy Operations
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
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
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-gray-700">
          <ShieldCheck className="h-4 w-4 text-primary-base" />
          Live data synced
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="border-gray-200 bg-white shadow-sm"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary-100 p-2 text-primary-base">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500">{stat.trend}</p>
                {stat.newThisWeek !== undefined && (
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                      stat.newThisWeek > 0
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    {stat.newThisWeek > 0
                      ? `+${stat.newThisWeek.toLocaleString()} this week`
                      : 'No new this week'}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Catalog health
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            {[
              {
                label: 'Priced medicines',
                value: pricingCoverage,
                color: 'bg-emerald-500',
              },
              {
                label: 'Barcode coverage',
                value: barcodeCoverage,
                color: 'bg-sky-500',
              },
              {
                label: 'Unpriced entries',
                value:
                  totalMedicines > 0
                    ? Math.round((unpricedMedicines / totalMedicines) * 100)
                    : 0,
                color: 'bg-amber-500',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
                  <span>{item.label}</span>
                  <span className="tabular-nums">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:border-primary-base hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Medicines low on stock across pharmacies
            </CardTitle>
            <div className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Watchlist
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockAlerts.length > 0 ? (
              stockAlerts.map((alert) => (
                <div
                  key={alert.name}
                  className="flex items-start justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{alert.name}</p>
                    <p className="text-sm text-gray-500">{alert.detail}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      alert.severity === 'Out of stock'
                        ? 'bg-rose-50 text-rose-700'
                        : alert.severity === 'Low stock'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                No stock alerts to display right now.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Pharmacy breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            {pharmacyBreakdown.length > 0 ? (
              pharmacyBreakdown.map((pharmacy) => (
                <div
                  key={pharmacy.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-primary-base hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-base">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <p className="truncate font-medium text-gray-900">
                      {pharmacy.name}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    <Users className="h-3.5 w-3.5" />
                    {pharmacy.userCount} linked{' '}
                    {pharmacy.userCount === 1 ? 'user' : 'users'}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Pharmacies will appear here as soon as they are registered.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Platform health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Active users</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {statusCounts.active}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Pending invites</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {statusCounts.pending}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Inactive accounts</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {statusCounts.inactive}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Suspended users</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {statusCounts.suspended}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Operational snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-base" />
                <span className="text-sm text-gray-600">
                  Pharmacies onboarded
                </span>
              </div>
              <span className="font-semibold text-gray-900">
                {pharmacyCount}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary-base" />
                <span className="text-sm text-gray-600">
                  Pharmacies with a branch
                </span>
              </div>
              <span className="font-semibold text-gray-900">
                {pharmaciesWithBranch} of {pharmacyCount}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary-base" />
                <span className="text-sm text-gray-600">Total branches</span>
              </div>
              <span className="font-semibold text-gray-900">
                {formatCount(totalBranches)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary-base" />
                <span className="text-sm text-gray-600">Users tracked</span>
              </div>
              <span className="font-semibold text-gray-900">
                {formatCount(userTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary-base" />
                <span className="text-sm text-gray-600">
                  Medicines in catalog
                </span>
              </div>
              <span className="font-semibold text-gray-900">
                {formatCount(totalMedicines)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}

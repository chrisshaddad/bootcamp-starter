'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Clock,
  MessageSquare,
  PackageX,
  Users,
} from 'lucide-react';
import type { PharmacyBranchStat } from '@repo/contracts';
import { usePharmacyStats } from '@/hooks/use-pharmacy-stats';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';

// Headline KPI tiles. Each links into the console that owns the metric — all
// reachable by a PHARMACY_ADMIN.
const KPI_TILES = [
  {
    key: 'branches',
    label: 'Branches',
    href: '/pharmacy/branches',
    icon: Building2,
    iconClass: 'bg-primary-100 text-primary-hover',
  },
  {
    key: 'employees',
    label: 'Employees',
    href: '/pharmacy/employees',
    icon: Users,
    iconClass: 'bg-success/10 text-success',
  },
  {
    key: 'openInquiries',
    label: 'Open inquiries',
    href: '/inquiries',
    icon: MessageSquare,
    iconClass: 'bg-warning/15 text-warning-dark',
  },
  {
    key: 'lowStock',
    label: 'Low stock',
    href: '/stock',
    icon: PackageX,
    iconClass: 'bg-error/10 text-error',
  },
] as const;

function BranchCard({ branch }: { branch: PharmacyBranchStat }) {
  const mini = [
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
      <Card className="h-full py-0 transition-shadow hover:shadow-md">
        <CardContent className="p-5">
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
          <div className="grid grid-cols-2 gap-3">
            {mini.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
              >
                <stat.icon className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-500">{stat.label}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PharmacyDashboardPage() {
  const { stats, isLoading, error, mutate } = usePharmacyStats();

  const value = (key: (typeof KPI_TILES)[number]['key']): number =>
    stats ? stats[key] : 0;

  return (
    <div className="space-y-6">
      <div className={ENTER} style={enterStyle(0)}>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          A live overview of your pharmacy across all its branches.
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
              Something went wrong while fetching your stats. Please try again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {KPI_TILES.map((tile, index) => (
              <Link key={tile.key} href={tile.href} className="group block">
                <Card
                  className={`py-0 transition-shadow hover:shadow-md ${ENTER}`}
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
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className={ENTER} style={enterStyle(360)}>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Branches
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : !stats || stats.perBranch.length === 0 ? (
              <Card className="py-0">
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stats.perBranch.map((branch) => (
                  <BranchCard key={branch.branchId} branch={branch} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

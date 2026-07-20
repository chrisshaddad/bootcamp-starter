'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ContactIcon, FileTextIcon, PlusIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

import { useGetRenterQuery } from '@/store/api/endpoints/renters.api';
import type { LeaseStatus, RenterEffectiveStatus } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Status badges ────────────────────────────────────────────────────────────

function RenterStatusBadge({
  status,
  labels,
}: {
  status: RenterEffectiveStatus;
  labels: Dictionary['renters']['status'];
}) {
  switch (status) {
    case 'current':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {labels.current}
        </Badge>
      );
    case 'former':
      return <Badge variant="secondary">{labels.former}</Badge>;
    case 'none':
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {labels.none}
        </Badge>
      );
  }
}

function LeaseStatusBadge({
  status,
  labels,
}: {
  status: LeaseStatus;
  labels: Dictionary['leases']['status'];
}) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {labels.active}
        </Badge>
      );
    case 'expired':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          {labels.expired}
        </Badge>
      );
    case 'terminated':
      return <Badge variant="destructive">{labels.terminated}</Badge>;
    case 'draft':
    default:
      return <Badge variant="secondary">{labels.draft}</Badge>;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

interface RenterDetailPageProps {
  renterId: string;
  locale: string;
  dict: Dictionary;
  /** When true (org_admin), show lease-creation entry points. */
  canWrite?: boolean;
}

export function RenterDetailPage({
  renterId,
  locale,
  dict,
  canWrite = false,
}: RenterDetailPageProps) {
  const t = dict.renters.detail;
  const router = useRouter();
  const { data: renter, isLoading, isError } = useGetRenterQuery(renterId);

  function goToNewLease() {
    router.push(`/${locale}/dashboard/leases?newLease=1&renterId=${renterId}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
    );
  }

  if (isError || !renter) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        {t.notFound}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Renter info header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ContactIcon className="size-6 text-muted-foreground" />
          {renter.fullName}
        </h1>
        <div className="flex items-center gap-3">
          <RenterStatusBadge
            status={renter.effectiveStatus}
            labels={dict.renters.status}
          />
          {canWrite && (
            <Button onClick={goToNewLease}>
              <PlusIcon />
              {t.newLease}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.email}</p>
          <p className="text-sm">{renter.email ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.phone}</p>
          <p className="text-sm">{renter.phone ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {t.emergencyContactName}
          </p>
          <p className="text-sm">{renter.emergencyContactName ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {t.emergencyContactPhone}
          </p>
          <p className="text-sm">{renter.emergencyContactPhone ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <p className="text-xs text-muted-foreground">{t.notes}</p>
          <p className="text-sm whitespace-pre-wrap">{renter.notes ?? '—'}</p>
        </div>
      </div>

      {/* Leases section */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {t.leasesTitle}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t.leasesSubtitle}
        </p>
      </div>

      {!renter.leases.length ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <FileTextIcon className="size-8 opacity-30" />
            <p>{t.noLeases}</p>
            {canWrite && (
              <Button size="sm" onClick={goToNewLease}>
                <PlusIcon />
                {t.newLease}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.table.apartment}</TableHead>
                <TableHead>{t.table.dates}</TableHead>
                <TableHead>{t.table.rent}</TableHead>
                <TableHead>{t.table.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renter.leases.map((lease) => (
                <TableRow
                  key={lease.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    router.push(
                      `/${locale}/dashboard/buildings/${lease.buildingId}/floors/${lease.floorId}/apartments/${lease.apartmentId}`,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(
                        `/${locale}/dashboard/buildings/${lease.buildingId}/floors/${lease.floorId}/apartments/${lease.apartmentId}`,
                      );
                    }
                  }}
                >
                  <TableCell>
                    <Link
                      href={`/${locale}/dashboard/buildings/${lease.buildingId}/floors/${lease.floorId}/apartments/${lease.apartmentId}`}
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.viewApartment}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(lease.startDate).toLocaleDateString()} –{' '}
                    {new Date(lease.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lease.rentAmount}
                  </TableCell>
                  <TableCell>
                    <LeaseStatusBadge
                      status={lease.effectiveStatus}
                      labels={dict.leases.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

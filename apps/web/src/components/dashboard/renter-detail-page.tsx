'use client';

import Link from 'next/link';
import { ContactIcon, FileTextIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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

// ── Status badges ────────────────────────────────────────────────────────────

function RenterStatusBadge({ status }: { status: RenterEffectiveStatus }) {
  switch (status) {
    case 'current':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Current
        </Badge>
      );
    case 'former':
      return <Badge variant="secondary">Former</Badge>;
    case 'none':
    default:
      return (
        <Badge variant="outline" className="text-xs">
          No lease yet
        </Badge>
      );
  }
}

function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Active
        </Badge>
      );
    case 'expired':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          Expired
        </Badge>
      );
    case 'terminated':
      return <Badge variant="destructive">Terminated</Badge>;
    case 'draft':
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

interface RenterDetailPageProps {
  renterId: string;
  locale: string;
}

export function RenterDetailPage({ renterId, locale }: RenterDetailPageProps) {
  const { data: renter, isLoading, isError } = useGetRenterQuery(renterId);

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
        Renter not found.
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
        <RenterStatusBadge status={renter.effectiveStatus} />
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm">{renter.email ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="text-sm">{renter.phone ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Emergency contact name
          </p>
          <p className="text-sm">{renter.emergencyContactName ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Emergency contact phone
          </p>
          <p className="text-sm">{renter.emergencyContactPhone ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{renter.notes ?? '—'}</p>
        </div>
      </div>

      {/* Leases section */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Leases</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          This renter&apos;s lease history, most recent first.
        </p>
      </div>

      {!renter.leases.length ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="text-center py-10 text-muted-foreground">
            <FileTextIcon className="size-8 mx-auto mb-2 opacity-30" />
            No leases yet.
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apartment</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renter.leases.map((lease) => (
                <TableRow key={lease.id}>
                  <TableCell>
                    <Link
                      href={`/${locale}/dashboard/buildings/${lease.buildingId}/floors/${lease.floorId}/apartments/${lease.apartmentId}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View apartment
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
                    <LeaseStatusBadge status={lease.effectiveStatus} />
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

'use client';

import { ContactIcon, FileTextIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useGetRenterQuery } from '@/store/api/endpoints/renters.api';

// ── Main component ────────────────────────────────────────────────────────────

interface RenterDetailPageProps {
  renterId: string;
  canWrite: boolean;
  locale: string;
}

export function RenterDetailPage({ renterId }: RenterDetailPageProps) {
  const { data: renter, isLoading } = useGetRenterQuery(renterId);

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

  return (
    <div className="flex flex-col gap-6">
      {/* Renter info header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ContactIcon className="size-6 text-muted-foreground" />
          {renter?.fullName ?? 'Renter'}
        </h1>
        <Badge variant="outline" className="text-xs">
          No lease yet
        </Badge>
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm">{renter?.email ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="text-sm">{renter?.phone ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Emergency contact name
          </p>
          <p className="text-sm">{renter?.emergencyContactName ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Emergency contact phone
          </p>
          <p className="text-sm">{renter?.emergencyContactPhone ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{renter?.notes ?? '—'}</p>
        </div>
      </div>

      {/* Leases section (populated in issues/002-leases-crud.md) */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Leases</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          This renter&apos;s lease history.
        </p>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="text-center py-10 text-muted-foreground">
          <FileTextIcon className="size-8 mx-auto mb-2 opacity-30" />
          No leases yet.
        </div>
      </div>
    </div>
  );
}

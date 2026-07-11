'use client';

import { EyeIcon, WrenchIcon } from 'lucide-react';

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

import { useListVendorsQuery } from '@/store/api/endpoints/vendors.api';
import type { VendorServiceType } from '@/types/api';

// ── Services-offered labels ─────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<VendorServiceType, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  cleaning: 'Cleaning',
  landscaping: 'Landscaping',
  hvac: 'HVAC',
  general_maintenance: 'General maintenance',
  other: 'Other',
};

function ServicesOfferedBadges({
  services,
}: {
  services: VendorServiceType[];
}) {
  if (services.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((service) => (
        <Badge key={service} variant="secondary" className="text-xs">
          {SERVICE_TYPE_LABELS[service] ?? service}
        </Badge>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface VendorsPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
}

export function VendorsPage({ canWrite }: VendorsPageProps) {
  const { data: vendors, isLoading, isError } = useListVendorsQuery();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Third-party service providers for your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              Read-only
            </Badge>
          )}
        </div>
      </div>

      {/* Vendors table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company name</TableHead>
              <TableHead>Contact name</TableHead>
              <TableHead>Phone / Email</TableHead>
              <TableHead>Services offered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  Failed to load vendors. Please try again.
                </TableCell>
              </TableRow>
            ) : vendors?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No vendors yet.
                </TableCell>
              </TableRow>
            ) : (
              vendors?.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <span className="font-medium text-sm">
                      {vendor.companyName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {vendor.contactName ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{vendor.phone ?? '—'}</span>
                      {vendor.email && (
                        <span className="text-xs">{vendor.email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ServicesOfferedBadges services={vendor.servicesOffered} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

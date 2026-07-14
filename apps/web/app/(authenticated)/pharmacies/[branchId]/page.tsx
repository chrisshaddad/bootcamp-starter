'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  Pill,
} from 'lucide-react';
import type { BranchStockedMedicine } from '@repo/contracts';
import { useDirectoryBranch } from '@/hooks/use-directory';
import { formatPrice } from '@/lib/stock';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';

// External maps link built from the branch coordinates — no API key, and (unlike
// the in-app Lebanon-locked LocationMap) it works for any coordinate. Mirrors
// how the A2 medicine-detail page surfaces branch locations.
function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function formatExpiry(value: string | Date | null): string {
  if (!value) return '—';
  // Expiry is a pure calendar date stored at UTC midnight (@db.Date). Render it
  // in UTC so a US-timezone reader doesn't see it shift to the previous month.
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function StockedMedicineRow({ medicine }: { medicine: BranchStockedMedicine }) {
  const meta = [medicine.form, medicine.dosage].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/find/${medicine.medicineId}`}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
        <Pill className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">
          {medicine.brandName}
        </p>
        <p className="truncate text-xs text-gray-500">
          {meta || 'Medicine'}
          {medicine.priceLbp !== null
            ? ` · ${formatPrice(medicine.priceLbp)}`
            : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900">
          <Package className="h-3.5 w-3.5 text-gray-400" />
          {medicine.totalQuantity}
        </p>
        <p className="text-xs text-gray-400">
          exp {formatExpiry(medicine.nearestExpiry)}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-primary-hover" />
    </Link>
  );
}

export default function BranchDetailPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params?.branchId;
  const { branch, isLoading, error } = useDirectoryBranch(branchId);

  return (
    <div className="space-y-6">
      <div className={ENTER} style={enterStyle(0)}>
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
          <Link href="/pharmacies">
            <ArrowLeft className="h-4 w-4" />
            All pharmacies
          </Link>
        </Button>
      </div>

      {error ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load this pharmacy
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              It may not exist, or something went wrong. Try again from the
              directory.
            </p>
          </CardContent>
        </Card>
      ) : isLoading || !branch ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <Card className={`py-0 ${ENTER}`} style={enterStyle(70)}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-hover">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold text-gray-900">
                      {branch.branchName}
                    </h1>
                    <p className="truncate text-sm text-gray-500">
                      {branch.pharmacyName}
                    </p>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link
                    href={`/my/inquiries/new?branchId=${branch.branchId}`}
                    aria-label={`Ask ${branch.branchName} a question`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Ask this pharmacy
                  </Link>
                </Button>
              </div>

              <div className="mt-4 space-y-1.5">
                <p className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  {branch.address}
                </p>
                {branch.phoneNumber ? (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    {branch.phoneNumber}
                  </p>
                ) : null}
              </div>

              <Button asChild variant="outline" className="mt-4">
                <a
                  href={directionsUrl(branch.latitude, branch.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-4 w-4" />
                  View on map / directions
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`gap-0 overflow-hidden py-0 ${ENTER}`}
            style={enterStyle(140)}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Package className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">
                In stock ({branch.medicines.length})
              </h2>
            </div>
            {branch.medicines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <Package className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  This branch has no medicines in stock right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {branch.medicines.map((medicine) => (
                  <StockedMedicineRow
                    key={medicine.medicineId}
                    medicine={medicine}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

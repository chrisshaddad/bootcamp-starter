'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageSquare,
  Navigation,
  Pill,
} from 'lucide-react';
import type { BranchAvailability, MedicineResponse } from '@repo/contracts';
import { useMedicine, useMedicineAlternatives } from '@/hooks/use-catalog';
import { useMedicineAvailability } from '@/hooks/use-medicine-availability';
import { formatPrice } from '@/lib/stock';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';
import { directionsUrl } from '@/lib/maps';

const ALT_PAGE_SIZE = 6; // 2 per row × 3 rows, like the search grid

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="h-2 w-2 rounded-full bg-primary-base" />
      <h2 className="text-sm font-bold uppercase tracking-wider text-primary-hover">
        {children}
      </h2>
      <span className="h-px flex-1 bg-primary-100" />
    </div>
  );
}

function BranchRow({
  branch,
  medicineId,
}: {
  branch: BranchAvailability;
  medicineId: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-gray-900">
            <Building2 className="h-4 w-4 shrink-0 text-primary-hover" />
            {branch.pharmacyName}
          </p>
          <p className="mt-0.5 text-sm text-gray-600">{branch.branchName}</p>
          <p className="mt-0.5 text-sm text-gray-500">{branch.address}</p>
        </div>
        {branch.distanceKm != null ? (
          <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-hover">
            {branch.distanceKm} km
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900">
            {branch.totalQuantity.toLocaleString()}
          </span>{' '}
          in stock
        </span>
        <span className="text-gray-600">
          Nearest expiry:{' '}
          <span className="font-medium text-gray-900">
            {formatDate(branch.nearestExpiry)}
          </span>
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          asChild
          className="gap-1.5 bg-primary-base font-semibold text-white hover:bg-primary-hover"
        >
          <Link
            href={`/my/inquiries/new?medicineId=${medicineId}&branchId=${branch.branchId}`}
          >
            <MessageSquare className="h-4 w-4" />
            Ask this pharmacy
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-1.5">
          <a
            href={directionsUrl(branch.latitude, branch.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation className="h-4 w-4" />
            Directions
          </a>
        </Button>
      </div>
    </div>
  );
}

function AlternativeCard({
  medicine,
  index,
}: {
  medicine: MedicineResponse;
  index: number;
}) {
  return (
    <Link
      href={`/find/${medicine.id}`}
      className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 pl-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_22px_42px_-22px_rgba(20,83,60,0.4)] ${ENTER}`}
      style={enterStyle(index * 60)}
    >
      {/* left accent bar grows on hover */}
      <span className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-primary-base transition-transform duration-300 group-hover:scale-y-100" />

      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-hover transition-colors duration-300 group-hover:bg-primary-base group-hover:text-white">
        <Pill className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 transition-colors group-hover:text-primary-hover">
          {medicine.brandName}
        </p>
        <p className="truncate text-xs text-gray-500">
          {medicine.ingredients.join(', ') || '—'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-bold text-gray-900">
          {formatPrice(medicine.priceLbp)}
        </span>
        <ArrowRight className="h-4 w-4 -translate-x-1 text-primary-base opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export default function MedicineDetailPage() {
  const params = useParams<{ medicineId: string }>();
  const medicineId = params.medicineId;

  const { medicine, isLoading, error } = useMedicine(medicineId);
  const { alternatives, isLoading: alternativesLoading } =
    useMedicineAlternatives(medicineId);
  const {
    hasLocation,
    branches,
    isLoading: availabilityLoading,
  } = useMedicineAvailability(medicineId);

  // Alternatives can be a long list (a common ingredient is widely shared), so
  // page through them client-side rather than dumping them all on the page.
  const [altPage, setAltPage] = useState(1);
  // The page component stays mounted when navigating between medicines (same
  // route segment), so reset pagination or a stale page can land past the end of
  // a shorter alternatives list — an empty grid with the pager hidden.
  useEffect(() => {
    setAltPage(1);
  }, [medicineId]);
  const altTotal = alternatives?.length ?? 0;
  const altTotalPages = Math.max(1, Math.ceil(altTotal / ALT_PAGE_SIZE));
  const pagedAlternatives =
    alternatives?.slice(
      (altPage - 1) * ALT_PAGE_SIZE,
      altPage * ALT_PAGE_SIZE,
    ) ?? [];

  const backLink = (
    <Link
      href="/find"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-primary-hover"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to search
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {backLink}
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        {backLink}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 py-16 text-center">
          <p className="font-semibold text-gray-900">Medicine not found</p>
          <p className="mt-1 text-sm text-gray-500">
            It may have been removed from the catalog.
          </p>
        </div>
      </div>
    );
  }

  const badges = [medicine.type, medicine.form, medicine.dosage].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className={ENTER} style={enterStyle(0)}>
        {backLink}
      </div>

      {/* Medicine header */}
      <section
        className={`rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 ${ENTER}`}
        style={enterStyle(70)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-hover">
              <Pill className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {medicine.brandName}
              </h1>
              {badges.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 text-lg font-bold text-gray-900">
            {formatPrice(medicine.priceLbp)}
          </span>
        </div>

        {medicine.ingredients.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Active ingredients
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {medicine.ingredients.map((ingredient) => (
                <span
                  key={ingredient}
                  className="rounded-full bg-primary-100 px-2.5 py-1 text-sm font-medium text-primary-hover"
                >
                  {ingredient}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Available near you */}
      <section className={ENTER} style={enterStyle(140)}>
        <SectionHeading>Available near you</SectionHeading>
        {availabilityLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : hasLocation === false ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-primary-200 bg-primary-100/50 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-base text-white">
              <MapPin className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-gray-900">
              Set your location to see nearby pharmacies
            </p>
            <p className="mt-1 max-w-sm text-sm text-gray-600">
              We&apos;ll rank the pharmacies that stock this medicine by
              distance from you.
            </p>
            <Button
              asChild
              className="mt-4 gap-1.5 bg-primary-base font-semibold text-white hover:bg-primary-hover"
            >
              <Link href="/profile">
                Set my location
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : branches && branches.length > 0 ? (
          <div className="space-y-4">
            {branches.map((branch) => (
              <BranchRow
                key={branch.branchId}
                branch={branch}
                medicineId={medicine.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 py-12 text-center">
            <p className="font-semibold text-gray-900">
              No nearby pharmacies stock this right now
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try an alternative below, or check back later.
            </p>
          </div>
        )}
      </section>

      {/* Alternatives */}
      {alternativesLoading ? (
        <section className={ENTER} style={enterStyle(210)}>
          <SectionHeading>Alternatives</SectionHeading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-19 w-full rounded-2xl" />
            <Skeleton className="h-19 w-full rounded-2xl" />
          </div>
        </section>
      ) : alternatives && alternatives.length > 0 ? (
        <section className={ENTER} style={enterStyle(210)}>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-primary-base" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary-hover">
              Alternatives
            </h2>
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-hover">
              {alternatives.length}
            </span>
            <span className="h-px flex-1 bg-primary-100" />
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Other medicines that share an active ingredient with{' '}
            <span className="font-medium text-gray-700">
              {medicine.brandName}
            </span>
            .
          </p>
          {/* keyed by page so cards re-animate in on each page change */}
          <div key={altPage} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pagedAlternatives.map((alt, altIndex) => (
              <AlternativeCard key={alt.id} medicine={alt} index={altIndex} />
            ))}
          </div>

          {altTotalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={altPage <= 1}
                onClick={() =>
                  setAltPage((current) => Math.max(1, current - 1))
                }
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm text-gray-500">
                Page {altPage} of {altTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={altPage >= altTotalPages}
                onClick={() =>
                  setAltPage((current) => Math.min(altTotalPages, current + 1))
                }
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

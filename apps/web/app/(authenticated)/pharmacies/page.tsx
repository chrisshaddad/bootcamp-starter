'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  Phone,
  Search,
} from 'lucide-react';
import type { DirectoryBranch } from '@repo/contracts';
import { useDirectory } from '@/hooks/use-directory';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';
import { cn } from '@/lib/utils';
import { directionsUrl } from '@/lib/maps';

// Two cards per row × three rows.
const PAGE_SIZE = 6;

// One card carries full emphasis — the nearest (`isPrimary`): filled brand-green
// icon, solid primary action, and a green distance pill. Every other card
// recedes: neutral icon, outline action, and distance as plain muted text, so
// the grid reads as a hierarchy rather than six identical green tiles.
function BranchCard({
  branch,
  isPrimary,
}: {
  branch: DirectoryBranch;
  isPrimary: boolean;
}) {
  const hasDistance = branch.distanceKm !== null;
  return (
    <Card className="h-full py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5">
        {/* Name / pharmacy block */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                isPrimary
                  ? 'bg-primary-100 text-primary-hover'
                  : 'bg-gray-100 text-gray-500',
              )}
            >
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">
                {branch.branchName}
              </p>
              <p className="truncate text-xs text-gray-500">
                {branch.pharmacyName}
              </p>
            </div>
          </div>
          {hasDistance ? (
            isPrimary ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-hover">
                <Navigation className="h-3 w-3" />
                {branch.distanceKm} km
              </span>
            ) : (
              <span className="shrink-0 text-xs text-gray-500">
                {branch.distanceKm} km
              </span>
            )
          ) : null}
        </div>

        {/* Divider: separates the identity block from the contact block */}
        <div className="my-3 border-t border-gray-100" />

        {/* Address / phone block */}
        <p className="mb-1 flex items-start gap-1.5 text-sm text-gray-600">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="line-clamp-2">{branch.address}</span>
        </p>
        {branch.phoneNumber ? (
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {branch.phoneNumber}
          </p>
        ) : null}

        {/* Actions: one primary + a compact icon-only directions button */}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button
            asChild
            size="sm"
            variant={isPrimary ? 'default' : 'outline'}
            className={cn(
              'flex-1',
              // Exact logo green with a solid darker hover (the default
              // variant's translucent hover looked washed out).
              isPrimary && 'bg-primary-base text-white hover:bg-primary-hover',
            )}
          >
            <Link href={`/pharmacies/${branch.branchId}`}>
              View pharmacy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-8 shrink-0 px-0"
          >
            <a
              href={directionsUrl(branch.latitude, branch.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Directions to ${branch.branchName}`}
              title="Directions"
            >
              <Navigation className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PharmaciesPage() {
  const [search, setSearch] = useState('');
  // Debounce before the search drives the SWR key, so typing doesn't fire a
  // request (and a three-field DB search) on every keystroke. Mirrors the
  // catalog finder's 300ms pattern.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { branches, orderedByDistance, isLoading, error } = useDirectory({
    search: debounced || undefined,
  });

  // Client-side pagination — the endpoint returns every branch (already sorted
  // nearest-first), so we just page the array here. Reset to page 1 whenever the
  // query changes so the reader isn't stranded on an out-of-range page.
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [debounced]);

  const all = branches ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pageBranches = all.slice(offset, offset + PAGE_SIZE);

  return (
    <div className="relative isolate space-y-6 overflow-hidden">
      {/* Brand watermark: the MedFind mark in logo green, faint and bleeding
          off the corner behind the content — a subtle nod to the theme. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 -z-10 h-72 w-72 select-none opacity-[0.05]"
      >
        {/* aria-hidden on the wrapper (not LogoMark, which only forwards
            className) so the decorative mark — whose SVG carries role="img" +
            an aria-label — is silenced for screen readers. */}
        <LogoMark className="h-full w-full text-primary-base" />
      </div>
      <div className={ENTER} style={enterStyle(0)}>
        <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse pharmacies near you and see what each branch has in stock.
        </p>
      </div>

      <div className={ENTER} style={enterStyle(70)}>
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by pharmacy, branch, or area…"
            className="h-10 w-full pl-9"
          />
        </div>
        {orderedByDistance ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Navigation className="h-3.5 w-3.5 text-primary-hover" />
            Sorted by distance from your saved location.
          </p>
        ) : null}
      </div>

      {error ? (
        <Card className={`py-0 ${ENTER}`} style={enterStyle(140)}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load pharmacies
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              Something went wrong while loading the directory. Please try
              again.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : !branches || branches.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No pharmacies found
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              {search
                ? 'No pharmacies match your search.'
                : 'No pharmacies are listed yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={ENTER} style={enterStyle(140)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pageBranches.map((branch, index) => (
              <BranchCard
                key={branch.branchId}
                branch={branch}
                // Only the single overall-nearest result leads — global index 0
                // (page 1, first slot), and only when the list is actually
                // distance-ordered (a saved location exists).
                isPrimary={(orderedByDistance ?? false) && offset + index === 0}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

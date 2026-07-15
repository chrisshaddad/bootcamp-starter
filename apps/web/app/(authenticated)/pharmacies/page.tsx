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
  MessageSquare,
  Navigation,
  Phone,
  Pill,
  Search,
  Star,
} from 'lucide-react';
import type { DirectoryBranch } from '@repo/contracts';
import { useDirectory } from '@/hooks/use-directory';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';
import { cn } from '@/lib/utils';
import { directionsUrl } from '@/lib/maps';

// Two cards per row × three rows.
const PAGE_SIZE = 6;

// A neutral "how much is here" chip. Kept muted (never green) so it doesn't
// compete with the distance signal that drives the card's hierarchy.
function StockChip({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      <Pill className="h-3 w-3" />
      {count > 0 ? `${count} in stock` : 'No stock listed'}
    </span>
  );
}

function DirectionsButton({ branch }: { branch: DirectoryBranch }) {
  return (
    <Button asChild size="sm" variant="outline" className="w-9 shrink-0 px-0">
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
  );
}

// The single nearest branch, pinned above the grid: a wide, green-tinted card
// with a left accent bar and the full set of actions. Only rendered when the
// list is actually distance-ordered, so "nearest" means something.
function SpotlightCard({ branch }: { branch: DirectoryBranch }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-b from-primary-100 to-white">
      <span className="absolute inset-y-0 left-0 w-1 bg-primary-base" />
      <div className="flex flex-col gap-4 p-6 pl-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary-hover ring-1 ring-primary-200">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-base px-2 py-0.5 text-xs font-semibold text-white">
                <Star className="h-3 w-3 fill-current" />
                Nearest
              </span>
              {branch.distanceKm !== null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-hover">
                  <Navigation className="h-3 w-3" />
                  {branch.distanceKm} km away
                </span>
              ) : null}
              <StockChip count={branch.stockedMedicineCount} />
            </div>
            <p className="truncate text-lg font-bold text-gray-900">
              {branch.branchName}
            </p>
            <p className="truncate text-sm text-gray-500">
              {branch.pharmacyName}
            </p>
            <div className="mt-2 space-y-1">
              <p className="flex items-start gap-1.5 text-sm text-gray-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="line-clamp-2">{branch.address}</span>
              </p>
              {branch.phoneNumber ? (
                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  {branch.phoneNumber}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            className="bg-primary-base text-white hover:bg-primary-hover"
          >
            <Link href={`/pharmacies/${branch.branchId}`}>
              View pharmacy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={`/my/inquiries/new?branchId=${branch.branchId}`}
              aria-label={`Ask ${branch.branchName} a question`}
            >
              <MessageSquare className="h-4 w-4" />
              Ask
            </Link>
          </Button>
          <DirectionsButton branch={branch} />
        </div>
      </div>
    </div>
  );
}

// A polished directory card: a gradient accent strip on top, a distance badge,
// a stock chip, and a subtle hover lift. Every one of these is a peer — the
// nearest branch is elevated separately as the spotlight above the grid.
function BranchCard({ branch }: { branch: DirectoryBranch }) {
  const hasDistance = branch.distanceKm !== null;
  return (
    <Card className="h-full overflow-hidden py-0 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1 bg-gradient-to-r from-primary-base to-primary-400" />
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
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
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary-200 px-2 py-0.5 text-xs font-semibold text-primary-hover">
              <Navigation className="h-3 w-3" />
              {branch.distanceKm} km
            </span>
          ) : null}
        </div>

        {/* Address block */}
        <p className="mt-3 flex items-start gap-1.5 text-sm text-gray-600">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="line-clamp-2">{branch.address}</span>
        </p>
        {branch.phoneNumber ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {branch.phoneNumber}
          </p>
        ) : null}

        <div className="mt-3">
          <StockChip count={branch.stockedMedicineCount} />
        </div>

        {/* Actions: one primary + a compact icon-only directions button */}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/pharmacies/${branch.branchId}`}>
              View pharmacy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <DirectionsButton branch={branch} />
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

  const all = branches ?? [];
  const total = all.length;

  // When distance-ordered, the overall-nearest branch leads as the spotlight and
  // is pulled out of the paged grid so it never appears twice. Without an origin
  // there's no meaningful "nearest", so everything flows into the grid.
  const spotlight = orderedByDistance && all.length > 0 ? all[0] : null;
  const gridBranches = spotlight ? all.slice(1) : all;

  // Client-side pagination over the (non-spotlight) branches. Reset to page 1
  // whenever the query changes so the reader isn't stranded out of range.
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [debounced]);

  const totalPages = Math.max(1, Math.ceil(gridBranches.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pageBranches = gridBranches.slice(offset, offset + PAGE_SIZE);

  const hasResults = !isLoading && !error && total > 0;

  return (
    <div className="space-y-6">
      {/* Gradient hero: title, blurb, search, and a live count — the page's
          front door. Soft white circles bleed off the corner for depth. */}
      <div
        className={cn(
          'relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-primary-hover via-primary-base to-primary-400 p-6 text-white sm:p-8',
          ENTER,
        )}
        style={enterStyle(0)}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 h-52 w-52 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-24 h-44 w-44 rounded-full bg-white/10"
        />
        <div className="relative">
          <h1 className="text-2xl font-bold sm:text-3xl">Pharmacies near you</h1>
          <p className="mt-1 max-w-lg text-sm text-white/85">
            Browse pharmacies and see what each branch has in stock.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by pharmacy, branch, or area…"
                className="h-11 w-full border-transparent bg-white pl-9 text-gray-900 shadow-sm placeholder:text-gray-400"
              />
            </div>
            {hasResults ? (
              <span className="inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-lg bg-white/15 px-4 text-sm font-semibold sm:self-auto">
                <Building2 className="h-4 w-4" />
                {total} {total === 1 ? 'pharmacy' : 'pharmacies'}
              </span>
            ) : null}
          </div>

          {orderedByDistance ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-white/75">
              <Navigation className="h-3.5 w-3.5" />
              Sorted by distance from your saved location.
            </p>
          ) : null}
        </div>
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
      ) : total === 0 ? (
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
          {spotlight ? (
            <div className="mb-4">
              <SpotlightCard branch={spotlight} />
            </div>
          ) : null}

          {pageBranches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {pageBranches.map((branch) => (
                <BranchCard key={branch.branchId} branch={branch} />
              ))}
            </div>
          ) : null}

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

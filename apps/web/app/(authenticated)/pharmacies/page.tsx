'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  MapPin,
  Navigation,
  Phone,
  Search,
} from 'lucide-react';
import type { DirectoryBranch } from '@repo/contracts';
import { useDirectory } from '@/hooks/use-directory';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';

// External maps directions link built from the branch coordinates — no API key.
function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function BranchCard({
  branch,
  showDistance,
}: {
  branch: DirectoryBranch;
  showDistance: boolean;
}) {
  return (
    <Card className="h-full py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
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
          {showDistance && branch.distanceKm !== null ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-hover">
              <Navigation className="h-3 w-3" />
              {branch.distanceKm} km
            </span>
          ) : null}
        </div>

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

        <div className="mt-4 flex items-center gap-2 pt-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/pharmacies/${branch.branchId}`}>
              View pharmacy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={directionsUrl(branch.latitude, branch.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Directions to ${branch.branchName}`}
            >
              <Navigation className="h-4 w-4" />
              Directions
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PharmaciesPage() {
  const [search, setSearch] = useState('');
  const { branches, orderedByDistance, isLoading, error } = useDirectory({
    search: search.trim() || undefined,
  });

  return (
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
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
        <div
          className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${ENTER}`}
          style={enterStyle(140)}
        >
          {branches.map((branch) => (
            <BranchCard
              key={branch.branchId}
              branch={branch}
              showDistance={orderedByDistance ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

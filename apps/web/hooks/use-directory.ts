'use client';

import useSWR from 'swr';
import type {
  BranchDetailResponse,
  BranchDirectoryResponse,
} from '@repo/contracts';

interface UseDirectoryOptions {
  search?: string;
  // Optional "near me" origin override; when omitted the API falls back to the
  // caller's saved location for nearest-first ordering.
  lat?: number;
  lng?: number;
}

/**
 * Browse/search the public pharmacy directory (GET /directory/branches). Global
 * and read-only for clients; ordered nearest-first when the caller has a saved
 * location (or an explicit lat/lng override), else name-ordered.
 */
export function useDirectory(options: UseDirectoryOptions = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.lat !== undefined) params.set('lat', String(options.lat));
  if (options.lng !== undefined) params.set('lng', String(options.lng));
  const qs = params.toString();

  const { data, error, isLoading } = useSWR<BranchDirectoryResponse>(
    `/directory/branches${qs ? `?${qs}` : ''}`,
  );

  return {
    branches: data?.branches,
    total: data?.total,
    orderedByDistance: data?.orderedByDistance,
    isLoading,
    error,
  };
}

/**
 * One branch's public profile + the medicines it currently stocks
 * (GET /directory/branches/:id).
 */
export function useDirectoryBranch(id: string | undefined) {
  const { data, error, isLoading } = useSWR<BranchDetailResponse>(
    id ? `/directory/branches/${id}` : null,
  );
  return { branch: data, isLoading, error };
}

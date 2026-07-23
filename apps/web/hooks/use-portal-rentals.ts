'use client';

import useSWR from 'swr';
import type { RentalListResponse } from '@repo/contracts';

/**
 * Hook for the patron's own rentals within the active library.
 */
export function usePortalRentals(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading } = useSWR<RentalListResponse>(
    enabled ? '/portal/rentals' : null,
  );

  return {
    rentals: data?.rentals,
    total: data?.total,
    isLoading,
    error,
  };
}

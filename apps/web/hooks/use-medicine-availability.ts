'use client';

import useSWR from 'swr';
import type { MedicineAvailabilityResponse } from '@repo/contracts';

/**
 * The pharmacy branches that currently stock a medicine, nearest-first from the
 * caller's saved location (GET /catalog/medicines/:id/availability). When
 * `hasLocation` is false the client has no saved location — prompt them to set
 * one instead of listing unsorted branches.
 */
export function useMedicineAvailability(id: string | undefined) {
  const { data, error, isLoading, mutate } =
    useSWR<MedicineAvailabilityResponse>(
      id ? `/catalog/medicines/${id}/availability` : null,
    );

  return {
    hasLocation: data?.hasLocation,
    branches: data?.branches,
    isLoading,
    error,
    mutate,
  };
}

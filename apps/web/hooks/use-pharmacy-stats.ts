'use client';

import useSWR from 'swr';
import type { PharmacyStatsResponse } from '@repo/contracts';

/**
 * Pharmacy-admin dashboard KPIs (`/stats/pharmacy`): headline counts across all
 * the caller's branches plus a per-branch breakdown. Scoped server-side to the
 * caller's pharmacy.
 */
export function usePharmacyStats() {
  const { data, error, isLoading, mutate } =
    useSWR<PharmacyStatsResponse>('/stats/pharmacy');
  return { stats: data, isLoading, error, mutate };
}

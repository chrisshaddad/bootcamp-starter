'use client';

import useSWR from 'swr';
import type {
  BranchStatsResponse,
  PharmacyStatsResponse,
} from '@repo/contracts';

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

/**
 * Branch dashboard aggregates (`/stats/branch`): low-stock / near-expiry alerts,
 * open-inquiry count, and a recent-activity feed. Scoped server-side to the
 * caller's own branch.
 */
export function useBranchStats() {
  const { data, error, isLoading, mutate } =
    useSWR<BranchStatsResponse>('/stats/branch');
  return { stats: data, isLoading, error, mutate };
}

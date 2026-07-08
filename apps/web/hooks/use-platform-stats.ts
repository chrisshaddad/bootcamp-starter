'use client';

import useSWR from 'swr';
import type { PlatformStatsResponse } from '@repo/contracts';

/**
 * Platform-wide KPI counts for the super-admin dashboard. The single
 * authoritative source for the overview cards: real totals (every row,
 * including the calling admin) plus genuine trailing-7-day growth deltas.
 */
export function usePlatformStats() {
  const { data, error, isLoading } =
    useSWR<PlatformStatsResponse>('/stats/platform');
  return { stats: data, isLoading, error };
}

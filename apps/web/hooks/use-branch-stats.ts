'use client';

import useSWR from 'swr';
import type { BranchStatsResponse } from '@repo/contracts';

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

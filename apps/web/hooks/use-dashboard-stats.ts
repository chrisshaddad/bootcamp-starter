'use client';

import useSWR from 'swr';
import type { DashboardStatsResponse } from '@repo/contracts';

/** Role-shaped dashboard metrics for the caller (Institution Admin / Staff / Professional). */
export function useDashboardStats(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { data, error, isLoading } = useSWR<DashboardStatsResponse>(
    enabled ? '/stats/dashboard' : null,
  );

  return {
    stats: data,
    isLoading,
    error,
  };
}

'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { DashboardStatsResponse } from '@repo/contracts';

interface UseDashboardReturn {
  stats: DashboardStatsResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const { data, error, isLoading, mutate } =
    useSWR<DashboardStatsResponse>('/dashboard/stats');

  return { stats: data, isLoading, error, mutate };
}

export function useUpdateGymSettings() {
  const updateMaxCapacity = useCallback(async (maxCapacity: number | null) => {
    return apiPatch<{ message: string }>('/gyms/settings', { maxCapacity });
  }, []);

  return { updateMaxCapacity };
}

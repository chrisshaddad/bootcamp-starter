'use client';

import useSWR from 'swr';
import type { DashboardResponse } from '@repo/contracts';

interface UseDashboardOptions {
  dateFrom?: string;
  dateTo?: string;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const params = new URLSearchParams();
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);

  const query = params.toString();
  const endpoint = `/dashboard${query ? `?${query}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
    endpoint,
  );

  return {
    dashboard: data,
    isLoading,
    error,
    mutate,
  };
}

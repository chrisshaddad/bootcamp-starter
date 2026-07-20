'use client';

import useSWR from 'swr';
import type { SuperAdminDashboardResponse } from '@repo/contracts';

import { fetcher, type ApiError } from '@/lib/api';

interface UseSuperAdminDashboardOptions {
  enabled?: boolean;
}

export function useSuperAdminDashboard(
  options: UseSuperAdminDashboardOptions = {},
) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    SuperAdminDashboardResponse,
    ApiError
  >(enabled ? '/dashboard/super-admin' : null, fetcher);

  return {
    dashboard: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

'use client';

import useSWR from 'swr';
import type {
  SuperAdminDashboardResponse,
  TeacherDashboardResponse,
} from '@repo/contracts';

import { fetcher, type ApiError } from '@/lib/api';

interface UseDashboardOptions {
  enabled?: boolean;
}

export function useSuperAdminDashboard(options: UseDashboardOptions = {}) {
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

export function useTeacherDashboard(options: UseDashboardOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    TeacherDashboardResponse,
    ApiError
  >(enabled ? '/dashboard/teacher' : null, fetcher);

  return {
    dashboard: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

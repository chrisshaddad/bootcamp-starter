'use client';

import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import type { EmployeeListResponse } from '@repo/contracts';

interface UseEmployeesOptions {
  departmentId?: string;
  mine?: boolean;
  limit?: number;
  page?: number;
  enabled?: boolean;
}

interface UseEmployeesReturn {
  employees: EmployeeListResponse['employees'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the list of employees, optionally scoped to the current
 * user's direct reports via `mine` (see EmployeesService.findAll).
 */
export function useEmployees(
  options: UseEmployeesOptions = {},
): UseEmployeesReturn {
  const { departmentId, mine, limit, page, enabled = true } = options;

  const params = new URLSearchParams();
  if (departmentId) params.set('departmentId', departmentId);
  if (mine) params.set('mine', 'true');
  if (limit) params.set('limit', String(limit));
  if (page) params.set('page', String(page));
  const query = params.toString();
  const endpoint = query ? `/employees?${query}` : '/employees';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<EmployeeListResponse>(enabled ? endpoint : null);

  return {
    employees: data?.employees,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseEmployeesInfiniteOptions {
  departmentId?: string;
  mine?: boolean;
  pageSize?: number;
  enabled?: boolean;
}

interface UseEmployeesInfiniteReturn {
  employees: EmployeeListResponse['employees'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

// API's max page size (see employee-list.query.ts) - used as the per-request
// page size while this hook transparently fetches every page.
const MAX_PAGE_SIZE = 100;

/**
 * Fetches every page of employees matching the filters, accumulating the
 * full result set. Use this (instead of `useEmployees`) where callers need
 * an accurate aggregate over the whole list - e.g. skills breakdowns - since
 * a single capped page silently under-counts once a team exceeds the page
 * size.
 */
export function useEmployeesInfinite(
  options: UseEmployeesInfiniteOptions = {},
): UseEmployeesInfiniteReturn {
  const {
    departmentId,
    mine,
    pageSize = MAX_PAGE_SIZE,
    enabled = true,
  } = options;

  const getKey = (
    pageIndex: number,
    previousPageData: EmployeeListResponse | null,
  ) => {
    if (!enabled) return null;
    if (previousPageData && previousPageData.employees.length < pageSize) {
      return null;
    }

    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (mine) params.set('mine', 'true');
    params.set('limit', String(pageSize));
    params.set('page', String(pageIndex + 1));
    return `/employees?${params.toString()}`;
  };

  const { data, error, isLoading, isValidating, size, setSize } =
    useSWRInfinite<EmployeeListResponse>(getKey);

  useEffect(() => {
    setSize(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, mine, enabled]);

  const total = data?.[0]?.total;
  const employees = useMemo(
    () => data?.flatMap((page) => page.employees),
    [data],
  );
  const loaded = employees?.length ?? 0;
  const hasMore = total !== undefined && loaded < total;

  useEffect(() => {
    if (enabled && hasMore && !isValidating) {
      setSize(size + 1);
    }
  }, [enabled, hasMore, isValidating, size, setSize]);

  return {
    employees,
    total,
    isLoading: isLoading || hasMore,
    error,
  };
}

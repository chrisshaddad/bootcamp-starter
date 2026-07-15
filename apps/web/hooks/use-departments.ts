'use client';

import useSWR from 'swr';
import type { DepartmentListResponse } from '@repo/contracts';

interface UseDepartmentsOptions {
  enabled?: boolean;
}

interface UseDepartmentsReturn {
  departments: DepartmentListResponse['departments'] | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook for fetching the list of departments in the current user's organization
 */
export function useDepartments(
  options: UseDepartmentsOptions = {},
): UseDepartmentsReturn {
  const { enabled = true } = options;

  const { data, error, isLoading } = useSWR<DepartmentListResponse>(
    enabled ? '/departments?limit=100' : null,
  );

  return {
    departments: data?.departments,
    isLoading,
    error,
  };
}

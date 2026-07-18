'use client';

import useSWR from 'swr';
import type { EmployeeListResponse } from '@repo/contracts';

interface UseEmployeesOptions {
  departmentId?: string;
  mine?: boolean;
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
  const { departmentId, mine, enabled = true } = options;

  const params = new URLSearchParams();
  if (departmentId) params.set('departmentId', departmentId);
  if (mine) params.set('mine', 'true');
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

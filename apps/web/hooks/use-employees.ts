'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  EmployeeBranchOptionsResponse,
  EmployeeInviteRequest,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeeResponse,
  EmployeeUpdateRequest,
} from '@repo/contracts';

interface UseEmployeesOptions {
  role?: EmployeeListQuery['role'];
  status?: EmployeeListQuery['status'];
  branchId?: string;
  enabled?: boolean;
}

/**
 * Fetch the caller pharmacy's employees. The API always scopes to the caller's
 * pharmacyId; the optional filters just narrow the result. Mirrors the read
 * pattern in `use-users.ts`.
 */
export function useEmployees(options: UseEmployeesOptions = {}) {
  const { role, status, branchId, enabled = true } = options;

  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  if (branchId) params.set('branchId', branchId);
  const query = params.toString();
  const endpoint = query ? `/employees?${query}` : '/employees';

  const { data, error, isLoading, mutate } = useSWR<EmployeeListResponse>(
    enabled ? endpoint : null,
  );

  return {
    employees: data?.employees,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/** Branch options for the invite / reassign dropdowns (scoped server-side). */
export function useEmployeeBranchOptions() {
  const { data, error, isLoading } = useSWR<EmployeeBranchOptionsResponse>(
    '/employees/branches',
  );
  return { branches: data, isLoading, error };
}

/**
 * Mutations for the employees console. Revalidates every cached `/employees`
 * list (all filter combinations) after a successful write.
 */
export function useEmployeeActions() {
  const revalidateLists = useCallback(
    () =>
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/employees'),
      ),
    [],
  );

  const inviteEmployee = useCallback(
    async (data: EmployeeInviteRequest): Promise<EmployeeResponse> => {
      const result = await apiPost<EmployeeResponse>('/employees', data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const updateEmployee = useCallback(
    async (
      id: string,
      data: EmployeeUpdateRequest,
    ): Promise<EmployeeResponse> => {
      const result = await apiPatch<EmployeeResponse>(`/employees/${id}`, data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  return { inviteEmployee, updateEmployee };
}

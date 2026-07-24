'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  DepartmentListResponse,
  DepartmentResponse,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
} from '@repo/contracts';

function invalidateDepartments() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/departments'),
    undefined,
    { revalidate: true },
  );
}

interface UseDepartmentsOptions {
  organizationId?: string;
  enabled?: boolean;
}

interface UseDepartmentsReturn {
  departments: DepartmentListResponse['departments'] | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook for fetching the list of departments in the current user's
 * organization. `organizationId` is only honored for Super Admin callers
 * (see DepartmentsService.findAll) - it scopes a department picker to a
 * specific organization when managing users across tenants.
 */
export function useDepartments(
  options: UseDepartmentsOptions = {},
): UseDepartmentsReturn {
  const { organizationId, enabled = true } = options;

  const params = new URLSearchParams({ limit: '100' });
  if (organizationId) params.set('organizationId', organizationId);

  const { data, error, isLoading } = useSWR<DepartmentListResponse>(
    enabled ? `/departments?${params.toString()}` : null,
  );

  return {
    departments: data?.departments,
    isLoading,
    error,
  };
}

interface UseDepartmentMutationsReturn {
  createDepartment: (
    data: DepartmentCreateRequest,
  ) => Promise<DepartmentResponse>;
  updateDepartment: (
    id: string,
    data: DepartmentUpdateRequest,
  ) => Promise<DepartmentResponse>;
  deleteDepartment: (id: string) => Promise<void>;
}

/**
 * Create/update/delete departments (ORG_ADMIN only, enforced server-side).
 * Revalidates every cached `/departments` list after each mutation.
 */
export function useDepartmentMutations(): UseDepartmentMutationsReturn {
  const createDepartment = useCallback(
    async (data: DepartmentCreateRequest) => {
      const result = await apiPost<DepartmentResponse>('/departments', data);
      invalidateDepartments();
      return result;
    },
    [],
  );

  const updateDepartment = useCallback(
    async (id: string, data: DepartmentUpdateRequest) => {
      const result = await apiPatch<DepartmentResponse>(
        `/departments/${id}`,
        data,
      );
      invalidateDepartments();
      return result;
    },
    [],
  );

  const deleteDepartment = useCallback(async (id: string) => {
    await apiDelete(`/departments/${id}`);
    invalidateDepartments();
  }, []);

  return { createDepartment, updateDepartment, deleteDepartment };
}

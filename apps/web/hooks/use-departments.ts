'use client';

import useSWR from 'swr';
import type { DepartmentListResponse } from '@repo/contracts';

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

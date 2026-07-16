'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type {
  EmployeeResponse,
  EmployeeSkillsUpdateRequest,
  EmployeeProfileUpdateRequest,
} from '@repo/contracts';

interface UseEmployeeOptions {
  enabled?: boolean;
}

interface UseEmployeeReturn {
  employee: EmployeeResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  updateSkills: (
    data: EmployeeSkillsUpdateRequest,
  ) => Promise<EmployeeResponse>;
  updateProfile: (
    data: EmployeeProfileUpdateRequest,
  ) => Promise<EmployeeResponse>;
  mutate: () => void;
}

/**
 * Hook for fetching one employee's full record (profile + skills) and
 * performing self-service updates to it.
 */
export function useEmployee(
  id: string | undefined,
  options: UseEmployeeOptions = {},
): UseEmployeeReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<EmployeeResponse>(enabled && id ? `/employees/${id}` : null);

  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/employees'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  const updateSkills = useCallback(
    async (data: EmployeeSkillsUpdateRequest) => {
      const result = await apiPatch<EmployeeResponse>(
        `/employees/${id}/skills`,
        data,
      );
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  const updateProfile = useCallback(
    async (data: EmployeeProfileUpdateRequest) => {
      const result = await apiPatch<EmployeeResponse>(
        `/employees/${id}/profile`,
        data,
      );
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  return {
    employee: data,
    isLoading,
    error,
    updateSkills,
    updateProfile,
    mutate: swrMutate,
  };
}

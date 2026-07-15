'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  ApplicationListResponse,
  ApplicationResponse,
  ApplicationStatus,
  ApplicationCreateRequest,
} from '@repo/contracts';

interface UseApplicationsOptions {
  status?: ApplicationStatus;
  enabled?: boolean;
}

interface UseApplicationsReturn {
  applications: ApplicationListResponse['applications'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the list of applications with optional status filter
 */
export function useApplications(
  options: UseApplicationsOptions = {},
): UseApplicationsReturn {
  const { status, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const query = params.toString();
  const endpoint = query ? `/applications?${query}` : '/applications';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<ApplicationListResponse>(enabled ? endpoint : null);

  return {
    applications: data?.applications,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseApplicationOptions {
  enabled?: boolean;
}

interface UseApplicationReturn {
  application: ApplicationResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching a single application by ID
 */
export function useApplication(
  id: string,
  options: UseApplicationOptions = {},
): UseApplicationReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<ApplicationResponse>(enabled ? `/applications/${id}` : null);

  return {
    application: data,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseApplicationMutationsReturn {
  createApplication: (
    data: ApplicationCreateRequest,
  ) => Promise<ApplicationResponse>;
  withdrawApplication: (id: string) => Promise<ApplicationResponse>;
}

/**
 * Hook for creating applications and withdrawing them.
 * Invalidates all cached `/applications` lists after each mutation.
 */
export function useApplicationMutations(): UseApplicationMutationsReturn {
  const invalidateAll = useCallback(() => {
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/applications'),
      undefined,
      { revalidate: true },
    );
    // Also invalidate opportunities (application count changes)
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/opportunities'),
      undefined,
      { revalidate: true },
    );
  }, []);

  const createApplication = useCallback(
    async (data: ApplicationCreateRequest) => {
      const result = await apiPost<ApplicationResponse>(
        '/applications',
        data,
      );
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  const withdrawApplication = useCallback(
    async (id: string) => {
      const result = await apiPatch<ApplicationResponse>(
        `/applications/${id}`,
        { status: 'WITHDRAWN' },
      );
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  return { createApplication, withdrawApplication };
}

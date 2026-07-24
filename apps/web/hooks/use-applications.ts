'use client';

import useSWR, { mutate } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useCallback, useEffect, useMemo } from 'react';
import { apiPost, apiPatch, ApiError } from '@/lib/api';
import type {
  ApplicationListResponse,
  ApplicationResponse,
  ApplicationStatus,
  ApplicationCreateRequest,
} from '@repo/contracts';

interface UseApplicationsOptions {
  status?: ApplicationStatus;
  team?: boolean;
  limit?: number;
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
  const { status, team, limit, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (team) params.set('team', 'true');
  if (limit) params.set('limit', String(limit));
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

interface UseApplicationsInfiniteOptions {
  status?: ApplicationStatus;
  team?: boolean;
  pageSize?: number;
  enabled?: boolean;
}

interface UseApplicationsInfiniteReturn {
  applications: ApplicationListResponse['applications'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: Error | undefined;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Fetches applications a page at a time via `loadMore`, so lists beyond the
 * default page size (e.g. a manager's team-wide applications) stay reachable
 * instead of being silently truncated.
 */
export function useApplicationsInfinite(
  options: UseApplicationsInfiniteOptions = {},
): UseApplicationsInfiniteReturn {
  const {
    status,
    team,
    pageSize = DEFAULT_PAGE_SIZE,
    enabled = true,
  } = options;

  const getKey = (
    pageIndex: number,
    previousPageData: ApplicationListResponse | null,
  ) => {
    if (!enabled) return null;
    if (previousPageData && previousPageData.applications.length < pageSize) {
      return null;
    }

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (team) params.set('team', 'true');
    params.set('limit', String(pageSize));
    params.set('page', String(pageIndex + 1));
    return `/applications?${params.toString()}`;
  };

  const { data, error, isLoading, isValidating, size, setSize } =
    useSWRInfinite<ApplicationListResponse>(getKey);

  useEffect(() => {
    setSize(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, team, enabled]);

  const applications = useMemo(
    () => data?.flatMap((page) => page.applications),
    [data],
  );
  const total = data?.[0]?.total;
  const loaded = applications?.length ?? 0;
  const hasMore = total !== undefined && loaded < total;

  return {
    applications,
    total,
    isLoading,
    isLoadingMore: isValidating && size > 1,
    hasMore,
    loadMore: () => setSize(size + 1),
    error,
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
  reviewApplication: (
    id: string,
    decision: 'ACCEPTED' | 'REJECTED',
    reviewerNotes?: string,
  ) => Promise<ApplicationResponse>;
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
      try {
        const result = await apiPost<ApplicationResponse>(
          '/applications',
          data,
        );
        invalidateAll();
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          // Already applied - refetch so the opportunity's `hasApplied`
          // flips and the UI recovers (e.g. a stale cache let the apply
          // dialog open again).
          invalidateAll();
        }
        throw error;
      }
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

  const reviewApplication = useCallback(
    async (
      id: string,
      decision: 'ACCEPTED' | 'REJECTED',
      reviewerNotes?: string,
    ) => {
      const result = await apiPatch<ApplicationResponse>(
        `/applications/${id}`,
        {
          status: decision,
          managerApproved: decision === 'ACCEPTED',
          reviewerNotes: reviewerNotes || undefined,
        },
      );
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  return {
    createApplication,
    withdrawApplication,
    reviewApplication,
  };
}

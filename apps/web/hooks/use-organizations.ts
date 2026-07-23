'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import type {
  OrganizationListResponse,
  OrganizationDetailResponse,
  OrganizationActionResponse,
  OrganizationDirectoryResponse,
  OrganizationStatus,
} from '@repo/contracts';

/**
 * Hook for the public library directory (ACTIVE organizations only) - used
 * by the patron-facing Discover page.
 */
export function useOrganizationDirectory() {
  const { data, error, isLoading } = useSWR<OrganizationDirectoryResponse>(
    '/organizations/directory',
  );

  return {
    organizations: data?.organizations,
    total: data?.total,
    isLoading,
    error,
  };
}

interface UseOrganizationsOptions {
  status?: OrganizationStatus;
  search?: string;
  enabled?: boolean;
}

interface UseOrganizationsReturn {
  organizations: OrganizationListResponse['organizations'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the list of organizations with optional status filter
 */
export function useOrganizations(
  options: UseOrganizationsOptions = {},
): UseOrganizationsReturn {
  const { status, search, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const trimmedSearch = search?.trim();
  if (trimmedSearch) params.set('search', trimmedSearch);
  const query = params.toString();
  const endpoint = query ? `/organizations?${query}` : '/organizations';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<OrganizationListResponse>(enabled ? endpoint : null);

  return {
    organizations: data?.organizations,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseOrganizationOptions {
  enabled?: boolean;
}

interface UseOrganizationReturn {
  organization: OrganizationDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  approve: () => Promise<OrganizationActionResponse>;
  reject: () => Promise<OrganizationActionResponse>;
  activate: () => Promise<OrganizationActionResponse>;
  deactivate: () => Promise<OrganizationActionResponse>;
  mutate: () => void;
}

/**
 * Hook for fetching a single organization and performing actions (approve/reject)
 */
export function useOrganization(
  id: string,
  options: UseOrganizationOptions = {},
): UseOrganizationReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<OrganizationDetailResponse>(
    enabled ? `/organizations/${id}` : null,
  );

  const invalidateAll = useCallback(() => {
    // Invalidate this specific organization + all organizations list variants.
    swrMutate();
    invalidateByPrefix('/organizations');
  }, [swrMutate]);

  const approve = useCallback(async () => {
    const result = await apiPatch<OrganizationActionResponse>(
      `/organizations/${id}/approve`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  const reject = useCallback(async () => {
    const result = await apiPatch<OrganizationActionResponse>(
      `/organizations/${id}/reject`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  const deactivate = useCallback(async () => {
    const result = await apiPatch<OrganizationActionResponse>(
      `/organizations/${id}/deactivate`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  const activate = useCallback(async () => {
    const result = await apiPatch<OrganizationActionResponse>(
      `/organizations/${id}/activate`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  return {
    organization: data,
    isLoading,
    error,
    approve,
    reject,
    activate,
    deactivate,
    mutate: swrMutate,
  };
}

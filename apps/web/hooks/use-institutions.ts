'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  InstitutionListResponse,
  InstitutionDetailResponse,
  InstitutionActionResponse,
  InstitutionCreateRequest,
  InstitutionStatus,
} from '@repo/contracts';

interface UseInstitutionsOptions {
  status?: InstitutionStatus;
  page?: number;
  enabled?: boolean;
}

interface UseInstitutionsReturn {
  institutions: InstitutionListResponse['institutions'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the list of institutions with optional status filter
 */
export function useInstitutions(
  options: UseInstitutionsOptions = {},
): UseInstitutionsReturn {
  const { status, page, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  const endpoint = qs ? `/institutions?${qs}` : '/institutions';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<InstitutionListResponse>(enabled ? endpoint : null);

  return {
    institutions: data?.institutions,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

function invalidateInstitutionsList() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/institutions'),
    undefined,
    { revalidate: true },
  );
}

interface UseInstitutionOptions {
  enabled?: boolean;
}

interface UseInstitutionReturn {
  institution: InstitutionDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  approve: () => Promise<InstitutionActionResponse>;
  reject: () => Promise<InstitutionActionResponse>;
  mutate: () => void;
}

/**
 * Hook for fetching a single institution and performing actions (approve/reject)
 */
export function useInstitution(
  id: string,
  options: UseInstitutionOptions = {},
): UseInstitutionReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<InstitutionDetailResponse>(enabled ? `/institutions/${id}` : null);

  const invalidateAll = useCallback(() => {
    swrMutate();
    invalidateInstitutionsList();
  }, [swrMutate]);

  const approve = useCallback(async () => {
    const result = await apiPatch<InstitutionActionResponse>(
      `/institutions/${id}/approve`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  const reject = useCallback(async () => {
    const result = await apiPatch<InstitutionActionResponse>(
      `/institutions/${id}/reject`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  return {
    institution: data,
    isLoading,
    error,
    approve,
    reject,
    mutate: swrMutate,
  };
}

/**
 * Hook for creating a new institution together with its first admin user
 */
export function useCreateInstitution() {
  const createInstitution = useCallback(
    async (data: InstitutionCreateRequest) => {
      const result = await apiPost<InstitutionDetailResponse>(
        '/institutions',
        data,
      );
      invalidateInstitutionsList();
      return result;
    },
    [],
  );

  return { createInstitution };
}

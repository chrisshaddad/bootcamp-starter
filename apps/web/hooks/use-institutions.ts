'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import {
  DEFAULT_PAGE_SIZE,
  type InstitutionListResponse,
  type InstitutionDetailResponse,
  type InstitutionActionResponse,
  type InstitutionCreateRequest,
  type InstitutionAdminCreateRequest,
  type InstitutionStatus,
} from '@repo/contracts';

interface UseInstitutionsOptions {
  status?: InstitutionStatus;
  page?: number;
  limit?: number;
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
  const { status, page, limit, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page && page > 1) params.set('page', String(page));
  if (limit && limit !== DEFAULT_PAGE_SIZE) params.set('limit', String(limit));
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
  suspend: () => Promise<InstitutionActionResponse>;
  reactivate: () => Promise<InstitutionActionResponse>;
  updateAdminEmail: (
    adminId: string,
    email: string,
  ) => Promise<InstitutionActionResponse>;
  addAdmin: (
    data: InstitutionAdminCreateRequest,
  ) => Promise<InstitutionActionResponse>;
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

  const suspend = useCallback(async () => {
    const result = await apiPatch<InstitutionActionResponse>(
      `/institutions/${id}/suspend`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  const reactivate = useCallback(async () => {
    const result = await apiPatch<InstitutionActionResponse>(
      `/institutions/${id}/reactivate`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  const updateAdminEmail = useCallback(
    async (adminId: string, email: string) => {
      const result = await apiPatch<InstitutionActionResponse>(
        `/institutions/${id}/admins/${adminId}/email`,
        { email },
      );
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  const addAdmin = useCallback(
    async (data: InstitutionAdminCreateRequest) => {
      const result = await apiPost<InstitutionActionResponse>(
        `/institutions/${id}/admins`,
        data,
      );
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  return {
    institution: data,
    isLoading,
    error,
    approve,
    reject,
    suspend,
    reactivate,
    updateAdminEmail,
    addAdmin,
    mutate: swrMutate,
  };
}

/**
 * Actions on an institution by id, without mounting the full detail hook —
 * for inline approve/reject on a list (e.g. the pending-approvals queue).
 */
export function useInstitutionActions() {
  const approve = useCallback(async (id: string) => {
    const result = await apiPatch<InstitutionActionResponse>(
      `/institutions/${id}/approve`,
    );
    invalidateInstitutionsList();
    return result;
  }, []);

  const reject = useCallback(async (id: string) => {
    const result = await apiPatch<InstitutionActionResponse>(
      `/institutions/${id}/reject`,
    );
    invalidateInstitutionsList();
    return result;
  }, []);

  return { approve, reject };
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

'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  ServiceListResponse,
  ServiceResponse,
  ServiceCreateRequest,
  ServiceUpdateRequest,
} from '@repo/contracts';

export function useServices(options: { activeOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (options.activeOnly) params.set('activeOnly', 'true');

  const endpoint = `/services${params.toString() ? `?${params}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<ServiceListResponse>(endpoint);

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/services'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const createService = useCallback(
    async (data: ServiceCreateRequest): Promise<ServiceResponse> => {
      const result = await apiPost<ServiceResponse>('/services', data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const updateService = useCallback(
    async (
      id: string,
      data: ServiceUpdateRequest,
    ): Promise<ServiceResponse> => {
      const result = await apiPatch<ServiceResponse>(`/services/${id}`, data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const deleteService = useCallback(
    async (id: string): Promise<void> => {
      await apiDelete(`/services/${id}`);
      invalidate();
    },
    [invalidate],
  );

  return {
    services: data?.services,
    meta: data?.meta,
    isLoading,
    error,
    createService,
    updateService,
    deleteService,
    mutate: invalidate,
  };
}

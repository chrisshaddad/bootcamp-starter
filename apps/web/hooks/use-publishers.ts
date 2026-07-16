'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  PublisherListResponse,
  PublisherResponse,
  PublisherCreateRequest,
  PublisherUpdateRequest,
} from '@repo/contracts';

const PREFIX = '/publishers';

interface UsePublishersOptions {
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}

/**
 * List + mutations hook for publishers (tenant-scoped by the API).
 */
export function usePublishers(options: UsePublishersOptions = {}) {
  const { page = 1, limit = 20, search, enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PublisherListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  const create = useCallback(async (body: PublisherCreateRequest) => {
    const res = await apiPost<PublisherResponse>(PREFIX, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const update = useCallback(
    async (id: string, body: PublisherUpdateRequest) => {
      const res = await apiPatch<PublisherResponse>(`${PREFIX}/${id}`, body);
      await invalidateByPrefix(PREFIX);
      return res;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await apiDelete(`${PREFIX}/${id}`);
    await invalidateByPrefix(PREFIX);
  }, []);

  return {
    publishers: data?.publishers,
    total: data?.total,
    isLoading,
    error,
    mutate,
    create,
    update,
    remove,
  };
}

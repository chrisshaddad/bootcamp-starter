'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  AuthorListResponse,
  AuthorResponse,
  AuthorCreateRequest,
  AuthorUpdateRequest,
} from '@repo/contracts';

const PREFIX = '/authors';

interface UseAuthorsOptions {
  page?: number;
  limit?: number;
  search?: string;
  /** Fetch even without a search term. Defaults to true for staff. */
  enabled?: boolean;
}

/**
 * List + mutations hook for authors (tenant-scoped by the API). Fetches only
 * for staff; create/update/remove revalidate every `/authors` view.
 */
export function useAuthors(options: UseAuthorsOptions = {}) {
  const { page = 1, limit = 20, search, enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<AuthorListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  const create = useCallback(async (body: AuthorCreateRequest) => {
    const res = await apiPost<AuthorResponse>(PREFIX, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const update = useCallback(async (id: string, body: AuthorUpdateRequest) => {
    const res = await apiPatch<AuthorResponse>(`${PREFIX}/${id}`, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(`${PREFIX}/${id}`);
    await invalidateByPrefix(PREFIX);
  }, []);

  return {
    authors: data?.authors,
    total: data?.total,
    isLoading,
    error,
    mutate,
    create,
    update,
    remove,
  };
}

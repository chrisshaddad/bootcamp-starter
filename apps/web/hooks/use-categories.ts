'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  CategoryListResponse,
  CategoryResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from '@repo/contracts';

const PREFIX = '/categories';

interface UseCategoriesOptions {
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}

/**
 * List + mutations hook for categories (tenant-scoped by the API).
 */
export function useCategories(options: UseCategoriesOptions = {}) {
  const { page = 1, limit = 20, search, enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<CategoryListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  const create = useCallback(async (body: CategoryCreateRequest) => {
    const res = await apiPost<CategoryResponse>(PREFIX, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const update = useCallback(
    async (id: string, body: CategoryUpdateRequest) => {
      const res = await apiPatch<CategoryResponse>(`${PREFIX}/${id}`, body);
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
    categories: data?.categories,
    total: data?.total,
    isLoading,
    error,
    mutate,
    create,
    update,
    remove,
  };
}

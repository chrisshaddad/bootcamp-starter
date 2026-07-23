'use client';

import useSWR from 'swr';
import type { CategoryListResponse } from '@repo/contracts';

/**
 * Hook for the active library's categories - used to populate the catalog
 * filter dropdown.
 */
export function usePortalCategories(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading } = useSWR<CategoryListResponse>(
    enabled ? '/portal/categories?limit=100' : null,
  );

  return {
    categories: data?.categories,
    total: data?.total,
    isLoading,
    error,
  };
}

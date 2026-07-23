'use client';

import useSWR from 'swr';
import type { AuthorListResponse } from '@repo/contracts';

/**
 * Hook for the active library's authors - used to populate the catalog
 * filter dropdown.
 */
export function usePortalAuthors(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading } = useSWR<AuthorListResponse>(
    enabled ? '/portal/authors?limit=100' : null,
  );

  return {
    authors: data?.authors,
    total: data?.total,
    isLoading,
    error,
  };
}

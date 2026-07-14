'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import type {
  LibraryMemberWithOrganizationListResponse,
  LibraryMemberActionResponse,
} from '@repo/contracts';

/**
 * Hook for the SUPER_ADMIN's platform-wide pending patron (membership
 * request) queue - mirrors useOrganizations' approve/reject pattern.
 */
export function usePendingPatrons(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading } =
    useSWR<LibraryMemberWithOrganizationListResponse>(
      enabled ? '/library-members/pending' : null,
    );

  const approve = useCallback(async (id: string) => {
    const result = await apiPatch<LibraryMemberActionResponse>(
      `/library-members/${id}/approve`,
    );
    invalidateByPrefix('/library-members/pending');
    return result;
  }, []);

  const reject = useCallback(async (id: string) => {
    const result = await apiPatch<LibraryMemberActionResponse>(
      `/library-members/${id}/reject`,
    );
    invalidateByPrefix('/library-members/pending');
    return result;
  }, []);

  return {
    patrons: data?.libraryMembers,
    total: data?.total,
    isLoading,
    error,
    approve,
    reject,
  };
}

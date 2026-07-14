'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import type {
  LibraryMemberWithOrganizationListResponse,
  LibraryMemberWithOrganizationResponse,
  PortalMembershipRequest,
} from '@repo/contracts';

/**
 * Hook for a patron's own membership requests/memberships across every
 * library, plus requesting access to a new one.
 */
export function usePortalMemberships() {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<LibraryMemberWithOrganizationListResponse>('/portal/memberships');

  const requestMembership = useCallback(
    async (data: PortalMembershipRequest) => {
      const result = await apiPost<LibraryMemberWithOrganizationResponse>(
        '/portal/memberships',
        data,
      );
      swrMutate();
      invalidateByPrefix('/library-members/pending');
      return result;
    },
    [swrMutate],
  );

  return {
    memberships: data?.libraryMembers,
    total: data?.total,
    isLoading,
    error,
    requestMembership,
    mutate: swrMutate,
  };
}

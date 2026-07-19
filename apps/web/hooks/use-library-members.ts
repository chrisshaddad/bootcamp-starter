'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  LibraryMemberListResponse,
  LibraryMemberResponse,
  LibraryMemberCreateRequest,
  LibraryMemberUpdateRequest,
  LibraryMemberStatus,
  LibraryMembershipType,
  LibraryMemberActionResponse,
} from '@repo/contracts';

const PREFIX = '/library-members';

interface UseLibraryMembersOptions {
  page?: number;
  limit?: number;
  search?: string;
  membershipStatus?: LibraryMemberStatus;
  membershipType?: LibraryMembershipType;
  enabled?: boolean;
}

/**
 * List + mutations hook for library members (tenant-scoped by the API).
 */
export function useLibraryMembers(options: UseLibraryMembersOptions = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    membershipStatus,
    membershipType,
    enabled = true,
  } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (membershipStatus) params.set('membershipStatus', membershipStatus);
  if (membershipType) params.set('membershipType', membershipType);
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<LibraryMemberListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  const create = useCallback(async (body: LibraryMemberCreateRequest) => {
    const res = await apiPost<LibraryMemberResponse>(PREFIX, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const update = useCallback(
    async (id: string, body: LibraryMemberUpdateRequest) => {
      const res = await apiPatch<LibraryMemberResponse>(
        `${PREFIX}/${id}`,
        body,
      );
      await invalidateByPrefix(PREFIX);
      return res;
    },
    [],
  );

  const approve = useCallback(async (id: string) => {
    const res = await apiPatch<LibraryMemberActionResponse>(
      `${PREFIX}/${id}/approve`,
    );
    await invalidateByPrefix(PREFIX);
    return res.libraryMember;
  }, []);

  const reject = useCallback(async (id: string) => {
    const res = await apiPatch<LibraryMemberActionResponse>(
      `${PREFIX}/${id}/reject`,
    );
    await invalidateByPrefix(PREFIX);
    return res.libraryMember;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(`${PREFIX}/${id}`);
    await invalidateByPrefix(PREFIX);
  }, []);

  return {
    members: data?.libraryMembers,
    total: data?.total,
    isLoading,
    error,
    mutate,
    create,
    update,
    approve,
    reject,
    remove,
  };
}

/**
 * Single library member fetch for the detail page.
 */
export function useLibraryMember(
  id: string,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const { data, error, isLoading, mutate } = useSWR<LibraryMemberResponse>(
    isStaff && enabled && id ? `${PREFIX}/${id}` : null,
  );

  return { member: data, isLoading, error, mutate };
}

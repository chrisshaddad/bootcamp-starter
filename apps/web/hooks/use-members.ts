'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  MemberListResponse,
  MemberResponse,
  MemberCreateRequest,
  MemberUpdateRequest,
  MemberStatus,
} from '@repo/contracts';

export const MEMBERS_PAGE_SIZE = 100;

interface UseMembersOptions {
  status?: MemberStatus;
  page?: number;
  enabled?: boolean;
}

interface UseMembersReturn {
  members: MemberListResponse['members'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch the paginated list of members with optional status filter */
export function useMembers(options: UseMembersOptions = {}): UseMembersReturn {
  const { status, page = 1, enabled = true } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(MEMBERS_PAGE_SIZE),
  });
  if (status) params.set('status', status);
  const endpoint = `/members?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<MemberListResponse>(enabled ? endpoint : null);

  return {
    members: data?.members,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseMemberOptions {
  enabled?: boolean;
}

interface UseMemberReturn {
  member: MemberResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  update: (dto: MemberUpdateRequest) => Promise<MemberResponse>;
  mutate: () => void;
}

/** Fetch a single member by ID and expose an update action */
export function useMember(
  id: string,
  options: UseMemberOptions = {},
): UseMemberReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<MemberResponse>(enabled ? `/members/${id}` : null);

  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/members'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  const update = useCallback(
    async (dto: MemberUpdateRequest) => {
      const result = await apiPatch<MemberResponse>(`/members/${id}`, dto);
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  return {
    member: data,
    isLoading,
    error,
    update,
    mutate: swrMutate,
  };
}

/** Create a new member and invalidate the members list */
export function useCreateMember() {
  const create = useCallback(async (dto: MemberCreateRequest) => {
    const result = await apiPost<MemberResponse>('/members', dto);
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/members'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { create };
}

'use client';

import useSWR, { type KeyedMutator } from 'swr';
import type { MemberListResponse } from '@repo/contracts';

interface UseMembersOptions {
  enabled?: boolean;
  organizationId?: string;
}

interface UseMembersReturn {
  members: MemberListResponse['members'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<MemberListResponse>;
}

export function useMembers(options: UseMembersOptions = {}): UseMembersReturn {
  const { enabled = true, organizationId } = options;

  const params = new URLSearchParams();
  if (organizationId) params.set('organizationId', organizationId);
  const query = params.toString();
  const endpoint = query ? `/members?${query}` : '/members';

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

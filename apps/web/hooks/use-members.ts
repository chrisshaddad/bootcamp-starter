'use client';

import useSWR from 'swr';
import type { MemberListResponse } from '@repo/contracts';

interface UseMembersOptions {
  enabled?: boolean;
}

interface UseMembersReturn {
  members: MemberListResponse['members'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

export function useMembers(options: UseMembersOptions = {}): UseMembersReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<MemberListResponse>(enabled ? '/members' : null);

  return {
    members: data?.members,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

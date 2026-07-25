'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { ProfileResponse, ProfileUpdateRequest } from '@repo/contracts';

const ENDPOINT = '/profile';

/**
 * The caller's own account + profile, with an update mutation. Any
 * authenticated role can read/write their own profile.
 */
export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<ProfileResponse>(ENDPOINT);

  const update = useCallback(
    async (body: ProfileUpdateRequest) => {
      const res = await apiPatch<ProfileResponse>(ENDPOINT, body);
      await mutate(res, { revalidate: false });
      return res;
    },
    [mutate],
  );

  return { profile: data, isLoading, error, mutate, update };
}

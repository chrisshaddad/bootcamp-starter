'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { SelfProfileResponse, SelfProfileUpdateRequest } from '@repo/contracts';

/** The logged-in user's own account profile (every role). */
export function useProfile() {
  const { data, error, isLoading, mutate } =
    useSWR<SelfProfileResponse>('/profile/me');

  const updateProfile = useCallback(
    async (payload: SelfProfileUpdateRequest) => {
      const result = await apiPatch<SelfProfileResponse>('/profile/me', payload);
      mutate(result);
      return result;
    },
    [mutate],
  );

  return {
    profile: data,
    isLoading,
    error,
    updateProfile,
  };
}

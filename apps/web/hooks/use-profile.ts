'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { ProfileResponse, ProfileUpdateRequest } from '@repo/contracts';

interface UseProfileReturn {
  profile: ProfileResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Hook for reading the signed-in user's own profile (GET /profile). */
export function useProfile(): UseProfileReturn {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<ProfileResponse>('/profile');

  return { profile: data, isLoading, error, mutate: swrMutate };
}

/** Action for updating the signed-in user's own profile. */
export function useProfileActions() {
  const updateProfile = useCallback(
    async (data: ProfileUpdateRequest): Promise<ProfileResponse> => {
      const result = await apiPatch<ProfileResponse>('/profile', data);
      // Prime the profile cache with the response, then revalidate `/auth/me`
      // so the navbar avatar/name reflect a changed first/last name.
      await globalMutate('/profile', result, { revalidate: false });
      await globalMutate('/auth/me');
      return result;
    },
    [],
  );

  return { updateProfile };
}

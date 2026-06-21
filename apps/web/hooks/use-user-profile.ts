'use client';

import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { UserResponse, UserProfileUpdateRequest } from '@repo/contracts';

export function useUserProfile() {
  const updateProfile = useCallback(
    async (data: UserProfileUpdateRequest): Promise<UserResponse> => {
      return apiPatch<UserResponse>('/auth/profile', data);
    },
    [],
  );

  return {
    updateProfile,
  };
}

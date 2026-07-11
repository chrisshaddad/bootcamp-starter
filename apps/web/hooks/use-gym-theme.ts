'use client';

import { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';

/** Update the caller's gym brand color. Pass null to reset to the site default. */
export function useGymTheme() {
  const updateThemeColor = useCallback(async (themeColor: string | null) => {
    const result = await apiPatch<{ message: string }>('/gyms/settings', {
      themeColor,
    });
    await mutate('/auth/me');
    return result;
  }, []);

  return { updateThemeColor };
}

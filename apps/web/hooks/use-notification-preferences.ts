'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch, ApiError } from '@/lib/api';
import type {
  NotificationPreferencesResponse,
  NotificationPreferencesUpdateRequest,
} from '@repo/contracts';

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferencesResponse | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  updatePreferences: (
    data: NotificationPreferencesUpdateRequest,
  ) => Promise<NotificationPreferencesResponse>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { data, error, isLoading, mutate } = useSWR<
    NotificationPreferencesResponse,
    ApiError
  >('/settings/notifications');

  const updatePreferences = useCallback(
    async (update: NotificationPreferencesUpdateRequest) => {
      const result = await apiPatch<NotificationPreferencesResponse>(
        '/settings/notifications',
        update,
      );
      await mutate(result, { revalidate: false });
      return result;
    },
    [mutate],
  );

  return {
    preferences: data,
    isLoading,
    error,
    updatePreferences,
  };
}

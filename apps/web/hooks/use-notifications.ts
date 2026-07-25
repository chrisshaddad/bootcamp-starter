'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import {
  DEFAULT_PAGE_SIZE,
  type NotificationListResponse,
} from '@repo/contracts';

interface UseNotificationsOptions {
  enabled?: boolean;
  page?: number;
  limit?: number;
}

function buildNotificationsKey(options: UseNotificationsOptions): string {
  const params = new URLSearchParams();
  if (options.page && options.page > 1)
    params.set('page', String(options.page));
  if (options.limit && options.limit !== DEFAULT_PAGE_SIZE) {
    params.set('limit', String(options.limit));
  }
  const qs = params.toString();
  return qs ? `/notifications?${qs}` : '/notifications';
}

/**
 * Fetches the caller's notification inbox with a light poll so the navbar
 * bell badge stays roughly fresh.
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<NotificationListResponse>(
    enabled ? buildNotificationsKey(options) : null,
    { refreshInterval: 30000 },
  );

  const markRead = useCallback(
    async (id: string) => {
      await apiPatch(`/notifications/${id}/read`);
      mutate();
    },
    [mutate],
  );

  const markAllRead = useCallback(async () => {
    await apiPatch('/notifications/read-all');
    mutate();
  }, [mutate]);

  return {
    notifications: data?.notifications,
    unreadCount: data?.unreadCount ?? 0,
    total: data?.total,
    isLoading,
    error,
    markRead,
    markAllRead,
    mutate,
  };
}

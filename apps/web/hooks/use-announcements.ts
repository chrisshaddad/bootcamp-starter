'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost } from '@/lib/api';
import type {
  Announcement,
  AnnouncementCreateRequest,
  AnnouncementListResponse,
} from '@repo/contracts';

interface UseAnnouncementsOptions {
  enabled?: boolean;
  limit?: number;
}

interface UseAnnouncementsReturn {
  announcements: Announcement[] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  create: (data: AnnouncementCreateRequest) => Promise<Announcement>;
  mutate: () => void;
}

export function useAnnouncements(
  options: UseAnnouncementsOptions = {},
): UseAnnouncementsReturn {
  const { enabled = true, limit } = options;
  const endpoint = limit ? `/announcements?limit=${limit}` : '/announcements';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<AnnouncementListResponse>(enabled ? endpoint : null);

  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/announcements'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  const create = useCallback(
    async (body: AnnouncementCreateRequest) => {
      const result = await apiPost<Announcement>('/announcements', body);
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  return {
    announcements: data?.announcements,
    total: data?.total,
    isLoading,
    error,
    create,
    mutate: swrMutate,
  };
}

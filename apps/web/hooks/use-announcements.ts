'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import type {
  Announcement,
  AnnouncementCreateRequest,
  AnnouncementListResponse,
  AnnouncementUpdateRequest,
} from '@repo/contracts';

interface UseAnnouncementsOptions {
  enabled?: boolean;
  limit?: number;
  eventId?: string;
}

interface UseAnnouncementsReturn {
  announcements: Announcement[] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  create: (data: AnnouncementCreateRequest) => Promise<Announcement>;
  update: (
    id: string,
    data: AnnouncementUpdateRequest,
  ) => Promise<Announcement>;
  remove: (id: string) => Promise<Announcement>;
  mutate: () => void;
}

export function useAnnouncements(
  options: UseAnnouncementsOptions = {},
): UseAnnouncementsReturn {
  const { enabled = true, limit, eventId } = options;
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (eventId) params.set('eventId', eventId);
  const query = params.toString();
  const endpoint = query ? `/announcements?${query}` : '/announcements';

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

  const update = useCallback(
    async (id: string, body: AnnouncementUpdateRequest) => {
      const result = await apiPatch<Announcement>(`/announcements/${id}`, body);
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await apiDelete<Announcement>(`/announcements/${id}`);
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
    update,
    remove,
    mutate: swrMutate,
  };
}

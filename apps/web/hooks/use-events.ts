'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost } from '@/lib/api';
import type {
  EventDetailResponse,
  EventListResponse,
  EventRegisterResponse,
} from '@repo/contracts';

interface UseEventsOptions {
  enabled?: boolean;
  upcoming?: boolean;
}

interface UseEventsReturn {
  events: EventListResponse['events'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const { enabled = true, upcoming } = options;

  const endpoint =
    upcoming === undefined
      ? '/events'
      : upcoming
        ? '/events?upcoming=true'
        : '/events?upcoming=false';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<EventListResponse>(enabled ? endpoint : null);

  return {
    events: data?.events,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseEventOptions {
  enabled?: boolean;
}

interface UseEventReturn {
  event: EventDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  register: () => Promise<EventRegisterResponse>;
  mutate: () => void;
}

export function useEvent(
  id: string,
  options: UseEventOptions = {},
): UseEventReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<EventDetailResponse>(enabled ? `/events/${id}` : null);

  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/events'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  const register = useCallback(async () => {
    const result = await apiPost<EventRegisterResponse>(
      `/events/${id}/register`,
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  return {
    event: data,
    isLoading,
    error,
    register,
    mutate: swrMutate,
  };
}

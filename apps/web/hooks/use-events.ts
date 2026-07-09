'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  EventAttendanceUpdateRequest,
  EventAttendanceUpdateResponse,
  EventAttendeeListResponse,
  EventDetailResponse,
  EventListResponse,
  EventRegisterResponse,
} from '@repo/contracts';

interface UseEventsOptions {
  enabled?: boolean;
  upcoming?: boolean;
  hostedByMe?: boolean;
}

interface UseEventsReturn {
  events: EventListResponse['events'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const { enabled = true, upcoming, hostedByMe } = options;

  const params = new URLSearchParams();
  if (upcoming === true) params.set('upcoming', 'true');
  else if (upcoming === false) params.set('upcoming', 'false');
  if (hostedByMe === true) params.set('hostedByMe', 'true');

  const query = params.toString();
  const endpoint = query ? `/events?${query}` : '/events';

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

interface UseEventAttendeesOptions {
  enabled?: boolean;
}

interface UseEventAttendeesReturn {
  attendees: EventAttendeeListResponse['attendees'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  updateAttendance: (
    userId: string,
    body: EventAttendanceUpdateRequest,
  ) => Promise<EventAttendanceUpdateResponse>;
  mutate: () => void;
}

export function useEventAttendees(
  eventId: string,
  options: UseEventAttendeesOptions = {},
): UseEventAttendeesReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<EventAttendeeListResponse>(
    enabled && eventId ? `/events/${eventId}/attendees` : null,
  );

  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/events'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  const updateAttendance = useCallback(
    async (userId: string, body: EventAttendanceUpdateRequest) => {
      const result = await apiPatch<EventAttendanceUpdateResponse>(
        `/events/${eventId}/attendees/${userId}/attendance`,
        body,
      );
      invalidateAll();
      return result;
    },
    [eventId, invalidateAll],
  );

  return {
    attendees: data?.attendees,
    total: data?.total,
    isLoading,
    error,
    updateAttendance,
    mutate: swrMutate,
  };
}

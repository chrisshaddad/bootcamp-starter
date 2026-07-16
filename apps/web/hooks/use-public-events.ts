'use client';

import useSWR from 'swr';
import type {
  PublicEventDetailResponse,
  PublicEventListResponse,
} from '@repo/contracts';

interface UsePublicEventsOptions {
  enabled?: boolean;
  organizationId?: string;
}

interface UsePublicEventsReturn {
  events: PublicEventListResponse['events'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function usePublicEvents(
  options: UsePublicEventsOptions = {},
): UsePublicEventsReturn {
  const { enabled = true, organizationId } = options;

  const params = new URLSearchParams();
  if (organizationId) params.set('organizationId', organizationId);
  const query = params.toString();
  const endpoint = query ? `/public/events?${query}` : '/public/events';

  const { data, error, isLoading } = useSWR<PublicEventListResponse>(
    enabled ? endpoint : null,
  );

  return {
    events: data?.events,
    total: data?.total,
    isLoading,
    error,
  };
}

interface UsePublicEventOptions {
  enabled?: boolean;
}

interface UsePublicEventReturn {
  event: PublicEventDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

export function usePublicEvent(
  id: string,
  options: UsePublicEventOptions = {},
): UsePublicEventReturn {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<PublicEventDetailResponse>(
    enabled && id ? `/public/events/${id}` : null,
  );

  return {
    event: data,
    isLoading,
    error,
    mutate,
  };
}

'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  SessionListResponse,
  SessionResponse,
  SessionCreateRequest,
  SessionUpdateRequest,
} from '@repo/contracts';

/** Options accepted by the useSessions hook */
interface UseSessionsOptions {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

/** Return value of useSessions — sessions list + loading state + revalidate trigger */
interface UseSessionsReturn {
  sessions: SessionListResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch the list of sessions for the gym, optionally filtered by date */
export function useSessions(
  options: UseSessionsOptions = {},
): UseSessionsReturn {
  const { startDate, endDate, enabled = true } = options;
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const endpoint = `/sessions${params.toString() ? `?${params.toString()}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<SessionListResponse>(enabled ? endpoint : null);

  return {
    sessions: data,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/** Return value of useSession — single session + update/cancel callbacks + loading state */
interface UseSessionReturn {
  session: SessionResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  update: (dto: SessionUpdateRequest) => Promise<SessionResponse>;
  cancel: () => Promise<SessionResponse>;
  mutate: () => void;
}

/** Fetch a single session by ID and expose update/cancel actions */
export function useSession(
  id: string,
  options: { enabled?: boolean } = {},
): UseSessionReturn {
  const { enabled = true } = options;
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<SessionResponse>(enabled ? `/sessions/${id}` : null);

  /** Invalidate related queries */
  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/sessions'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  /** Update the session */
  const update = useCallback(
    async (dto: SessionUpdateRequest) => {
      const result = await apiPatch<SessionResponse>(`/sessions/${id}`, dto);
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  /** Cancel the session */
  const cancel = useCallback(async () => {
    const result = await apiPatch<SessionResponse>(
      `/sessions/${id}/cancel`,
      {},
    );
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  return {
    session: data,
    isLoading,
    error,
    update,
    cancel,
    mutate: swrMutate,
  };
}

/** Create a new session and invalidate the sessions list */
export function useCreateSession() {
  const create = useCallback(async (dto: SessionCreateRequest) => {
    const result = await apiPost<SessionResponse>('/sessions', dto);
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/sessions'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { create };
}

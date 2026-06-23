'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type {
  GymListResponse,
  GymDetailResponse,
  GymActionResponse,
  GymStatus,
} from '@repo/contracts';

interface UseGymsOptions {
  status?: GymStatus;
  page?: number;
  enabled?: boolean;
}

interface UseGymsReturn {
  gyms: GymListResponse['gyms'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch the paginated list of gyms with optional status filter */
export function useGyms(options: UseGymsOptions = {}): UseGymsReturn {
  const { status, page = 1, enabled = true } = options;

  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  const endpoint = `/gyms?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<GymListResponse>(enabled ? endpoint : null);

  return {
    gyms: data?.gyms,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseGymOptions {
  enabled?: boolean;
}

interface UseGymReturn {
  gym: GymDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  approve: () => Promise<GymActionResponse>;
  reject: (reason: string) => Promise<GymActionResponse>;
  suspend: (reason: string) => Promise<GymActionResponse>;
  reactivate: () => Promise<GymActionResponse>;
  mutate: () => void;
}

/** Fetch a single gym by ID and expose approve/reject/suspend/reactivate actions */
export function useGym(id: string, options: UseGymOptions = {}): UseGymReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<GymDetailResponse>(enabled ? `/gyms/${id}` : null);

  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/gyms'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  const approve = useCallback(async () => {
    const result = await apiPatch<GymActionResponse>(`/gyms/${id}/approve`);
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  const reject = useCallback(
    async (reason: string) => {
      const result = await apiPatch<GymActionResponse>(`/gyms/${id}/reject`, {
        reason,
      });
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  const suspend = useCallback(
    async (reason: string) => {
      const result = await apiPatch<GymActionResponse>(`/gyms/${id}/suspend`, {
        reason,
      });
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  const reactivate = useCallback(async () => {
    const result = await apiPatch<GymActionResponse>(`/gyms/${id}/reactivate`);
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  return {
    gym: data,
    isLoading,
    error,
    approve,
    reject,
    suspend,
    reactivate,
    mutate: swrMutate,
  };
}

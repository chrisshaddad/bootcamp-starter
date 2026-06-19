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
  const { status, enabled = true } = options;

  const endpoint = status ? `/gyms?status=${status}` : '/gyms';

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
  reject: () => Promise<GymActionResponse>;
  mutate: () => void;
}

/** Fetch a single gym by ID and expose approve/reject actions */
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

  const reject = useCallback(async () => {
    const result = await apiPatch<GymActionResponse>(`/gyms/${id}/reject`);
    invalidateAll();
    return result;
  }, [id, invalidateAll]);

  return {
    gym: data,
    isLoading,
    error,
    approve,
    reject,
    mutate: swrMutate,
  };
}

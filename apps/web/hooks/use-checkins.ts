'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  CheckInListResponse,
  CheckInResponse,
  CheckInCreateRequest,
} from '@repo/contracts';

interface UseCheckInsReturn {
  checkIns: CheckInListResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

export function useCheckIns(): UseCheckInsReturn {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<CheckInListResponse>('/checkins/all');

  return {
    checkIns: data,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

export function useCheckInMember() {
  const checkInMember = useCallback(async (dto: CheckInCreateRequest) => {
    const result = await apiPost<CheckInResponse>('/checkins', dto);
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/checkins'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { checkInMember };
}

export function useCheckOutMember() {
  const checkOutMember = useCallback(async (checkInId: string) => {
    const result = await apiPatch<CheckInResponse>(
      `/checkins/${checkInId}/checkout`,
      {},
    );
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/checkins'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { checkOutMember };
}

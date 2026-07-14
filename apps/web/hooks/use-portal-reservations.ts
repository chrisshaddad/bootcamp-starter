'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import type {
  ReservationListResponse,
  ReservationResponse,
  ReservationCreateSelfRequest,
} from '@repo/contracts';

/**
 * Hook for the patron's own reservations (holds) within the active library,
 * plus placing/cancelling a hold.
 */
export function usePortalReservations(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<ReservationListResponse>(enabled ? '/portal/reservations' : null);

  const placeHold = useCallback(async (data: ReservationCreateSelfRequest) => {
    const result = await apiPost<ReservationResponse>(
      '/portal/reservations',
      data,
    );
    invalidateByPrefix('/portal/reservations');
    return result;
  }, []);

  const cancelHold = useCallback(async (id: string) => {
    const result = await apiPatch<ReservationResponse>(
      `/portal/reservations/${id}/cancel`,
    );
    invalidateByPrefix('/portal/reservations');
    return result;
  }, []);

  return {
    reservations: data?.reservations,
    total: data?.total,
    isLoading,
    error,
    placeHold,
    cancelHold,
    mutate: swrMutate,
  };
}

'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  ReservationListResponse,
  ReservationActionResponse,
  ReservationReadyRequest,
  ReservationFulfillRequest,
  ReservationStatus,
} from '@repo/contracts';

const PREFIX = '/reservations';

// Ready/fulfill/cancel move a copy's status and (on fulfill) create a rental,
// so refresh those views too.
async function invalidateReservations() {
  await Promise.all([
    invalidateByPrefix(PREFIX),
    invalidateByPrefix('/book-copies'),
    invalidateByPrefix('/rentals'),
  ]);
}

interface UseReservationsOptions {
  memberId?: string;
  bookId?: string;
  status?: ReservationStatus;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Read-only list of reservations (tenant-scoped by the API), filtered by
 * `memberId` (member history) or `status` (staff reservations queue).
 */
export function useReservations(options: UseReservationsOptions = {}) {
  const {
    memberId,
    bookId,
    status,
    page = 1,
    limit = 20,
    enabled = true,
  } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (memberId) params.set('memberId', memberId);
  if (bookId) params.set('bookId', bookId);
  if (status) params.set('status', status);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<ReservationListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  return {
    reservations: data?.reservations,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Staff reservation mutations: mark-ready (set aside a copy), fulfill (create
 * the loan), cancel. Each awaits then revalidates reservation/copy/rental views.
 */
export function useReservationActions() {
  const markReady = useCallback(
    async (id: string, body: ReservationReadyRequest) => {
      const res = await apiPatch<ReservationActionResponse>(
        `${PREFIX}/${id}/ready`,
        body,
      );
      await invalidateReservations();
      return res;
    },
    [],
  );

  const fulfill = useCallback(
    async (id: string, body: ReservationFulfillRequest = {}) => {
      const res = await apiPatch<ReservationActionResponse>(
        `${PREFIX}/${id}/fulfill`,
        body,
      );
      await invalidateReservations();
      return res;
    },
    [],
  );

  const cancel = useCallback(async (id: string) => {
    const res = await apiPatch<ReservationActionResponse>(
      `${PREFIX}/${id}/cancel`,
    );
    await invalidateReservations();
    return res;
  }, []);

  return { markReady, fulfill, cancel };
}

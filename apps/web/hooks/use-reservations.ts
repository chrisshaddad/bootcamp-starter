'use client';

import useSWR from 'swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type { ReservationListResponse } from '@repo/contracts';

const PREFIX = '/reservations';

interface UseReservationsOptions {
  memberId?: string;
  bookId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Read-only list of reservations (tenant-scoped by the API), typically filtered
 * by `memberId` for a member's reservation history.
 */
export function useReservations(options: UseReservationsOptions = {}) {
  const { memberId, bookId, page = 1, limit = 20, enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (memberId) params.set('memberId', memberId);
  if (bookId) params.set('bookId', bookId);
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

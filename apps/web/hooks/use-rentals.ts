'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  RentalListResponse,
  RentalActionResponse,
  RentalResponse,
  RentalCheckoutRequest,
  RentalReturnRequest,
  RentalLostRequest,
  RentalStatus,
} from '@repo/contracts';

const PREFIX = '/rentals';

// Checkout can free/claim a copy and fulfill a hold, so refresh those views too.
async function invalidateRentals() {
  await Promise.all([
    invalidateByPrefix(PREFIX),
    invalidateByPrefix('/book-copies'),
    invalidateByPrefix('/reservations'),
  ]);
}

interface UseRentalsOptions {
  memberId?: string;
  bookCopyId?: string;
  status?: RentalStatus;
  /** Not-returned rentals past their due date (server-side `?overdue=true`). */
  overdue?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Read-only list of rentals (tenant-scoped by the API). Filter by member, copy,
 * status, or `overdue`.
 */
export function useRentals(options: UseRentalsOptions = {}) {
  const {
    memberId,
    bookCopyId,
    status,
    overdue,
    page = 1,
    limit = 20,
    enabled = true,
  } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (memberId) params.set('memberId', memberId);
  if (bookCopyId) params.set('bookCopyId', bookCopyId);
  if (status) params.set('status', status);
  if (overdue) params.set('overdue', 'true');
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<RentalListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  return {
    rentals: data?.rentals,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Circulation mutations: check-out, return, mark-lost, pay-fine. Each awaits
 * then revalidates the rental/copy/reservation views.
 */
export function useRentalActions() {
  const checkout = useCallback(async (body: RentalCheckoutRequest) => {
    const res = await apiPost<RentalResponse>(PREFIX, body);
    await invalidateRentals();
    return res;
  }, []);

  const returnRental = useCallback(
    async (id: string, body: RentalReturnRequest = {}) => {
      const res = await apiPatch<RentalActionResponse>(
        `${PREFIX}/${id}/return`,
        body,
      );
      await invalidateRentals();
      return res;
    },
    [],
  );

  const markLost = useCallback(
    async (id: string, body: RentalLostRequest = {}) => {
      const res = await apiPatch<RentalActionResponse>(
        `${PREFIX}/${id}/lost`,
        body,
      );
      await invalidateRentals();
      return res;
    },
    [],
  );

  const payFine = useCallback(async (id: string) => {
    const res = await apiPatch<RentalActionResponse>(
      `${PREFIX}/${id}/pay-fine`,
    );
    await invalidateRentals();
    return res;
  }, []);

  return { checkout, returnRental, markLost, payFine };
}

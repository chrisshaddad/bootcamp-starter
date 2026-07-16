'use client';

import useSWR from 'swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type { RentalListResponse } from '@repo/contracts';

const PREFIX = '/rentals';

interface UseRentalsOptions {
  memberId?: string;
  bookCopyId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Read-only list of rentals (tenant-scoped by the API), typically filtered by
 * `memberId` for a member's loan history.
 */
export function useRentals(options: UseRentalsOptions = {}) {
  const {
    memberId,
    bookCopyId,
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

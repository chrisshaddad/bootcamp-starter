'use client';

import useSWR from 'swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type { PurchaseListResponse } from '@repo/contracts';

const PREFIX = '/purchases';

interface UsePurchasesOptions {
  memberId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Read-only list of purchases (tenant-scoped by the API), typically filtered by
 * `memberId` for a member's purchase history.
 */
export function usePurchases(options: UsePurchasesOptions = {}) {
  const { memberId, page = 1, limit = 20, enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (memberId) params.set('memberId', memberId);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PurchaseListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  return {
    purchases: data?.purchases,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

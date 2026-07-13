'use client';

import useSWR from 'swr';
import type {
  OpportunityListResponse,
  OpportunityStatus,
} from '@repo/contracts';

interface UseOpportunitiesOptions {
  status?: OpportunityStatus;
  enabled?: boolean;
}

interface UseOpportunitiesReturn {
  opportunities: OpportunityListResponse['opportunities'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the list of opportunities with optional status filter
 */
export function useOpportunities(
  options: UseOpportunitiesOptions = {},
): UseOpportunitiesReturn {
  const { status, enabled = true } = options;

  const endpoint = status
    ? `/opportunities?status=${status}`
    : '/opportunities';

  const { data, error, isLoading, mutate } = useSWR<OpportunityListResponse>(
    enabled ? endpoint : null,
  );

  return {
    opportunities: data?.opportunities,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

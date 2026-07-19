'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  OpportunityListResponse,
  OpportunityResponse,
  OpportunityStatus,
  OpportunityCreateRequest,
  OpportunityUpdateRequest,
} from '@repo/contracts';

interface UseOpportunitiesOptions {
  status?: OpportunityStatus;
  mine?: boolean;
  limit?: number;
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
 * Hook for fetching the list of opportunities with optional status/mine filter
 */
export function useOpportunities(
  options: UseOpportunitiesOptions = {},
): UseOpportunitiesReturn {
  const { status, mine, limit, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (mine) params.set('mine', 'true');
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  const endpoint = query ? `/opportunities?${query}` : '/opportunities';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<OpportunityListResponse>(enabled ? endpoint : null);

  return {
    opportunities: data?.opportunities,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseOpportunityMutationsReturn {
  createOpportunity: (
    data: OpportunityCreateRequest,
  ) => Promise<OpportunityResponse>;
  updateOpportunity: (
    id: string,
    data: OpportunityUpdateRequest,
  ) => Promise<OpportunityResponse>;
  deleteOpportunity: (id: string) => Promise<void>;
}

/**
 * Hook for creating/updating/deleting opportunities. Invalidates every
 * cached `/opportunities` list (any status/mine filter) after each mutation.
 */
interface UseOpportunityOptions {
  enabled?: boolean;
}

interface UseOpportunityReturn {
  opportunity: OpportunityResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching a single opportunity by ID
 */
export function useOpportunity(
  id: string,
  options: UseOpportunityOptions = {},
): UseOpportunityReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<OpportunityResponse>(
    enabled && id ? `/opportunities/${id}` : null,
  );

  return {
    opportunity: data,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

export function useOpportunityMutations(): UseOpportunityMutationsReturn {
  const invalidateAll = useCallback(() => {
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/opportunities'),
      undefined,
      { revalidate: true },
    );
  }, []);

  const createOpportunity = useCallback(
    async (data: OpportunityCreateRequest) => {
      const result = await apiPost<OpportunityResponse>('/opportunities', data);
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  const updateOpportunity = useCallback(
    async (id: string, data: OpportunityUpdateRequest) => {
      const result = await apiPatch<OpportunityResponse>(
        `/opportunities/${id}`,
        data,
      );
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  const deleteOpportunity = useCallback(
    async (id: string) => {
      await apiDelete(`/opportunities/${id}`);
      invalidateAll();
    },
    [invalidateAll],
  );

  return { createOpportunity, updateOpportunity, deleteOpportunity };
}

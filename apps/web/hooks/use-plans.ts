'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  PlanListResponse,
  PlanResponse,
  PlanCreateRequest,
  PlanUpdateRequest,
} from '@repo/contracts';

export const PLANS_PAGE_SIZE = 25;

interface UsePlansOptions {
  isActive?: boolean;
  page?: number;
  enabled?: boolean;
}

interface UsePlansReturn {
  plans: PlanListResponse['plans'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch the paginated list of membership plans with optional isActive filter */
export function usePlans(options: UsePlansOptions = {}): UsePlansReturn {
  const { isActive, page = 1, enabled = true } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(PLANS_PAGE_SIZE),
  });
  if (isActive !== undefined) params.set('isActive', String(isActive));
  const endpoint = `/plans?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PlanListResponse>(enabled ? endpoint : null);

  return {
    plans: data?.plans,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UsePlanReturn {
  plan: PlanResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  update: (dto: PlanUpdateRequest) => Promise<PlanResponse>;
  mutate: () => void;
}

/** Fetch a single membership plan by ID and expose an update action */
export function usePlan(id: string): UsePlanReturn {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PlanResponse>(`/plans/${id}`);

  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/plans'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  const update = useCallback(
    async (dto: PlanUpdateRequest) => {
      const result = await apiPatch<PlanResponse>(`/plans/${id}`, dto);
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  return {
    plan: data,
    isLoading,
    error,
    update,
    mutate: swrMutate,
  };
}

/** Create a new membership plan and invalidate the plans list */
export function useCreatePlan() {
  const create = useCallback(async (dto: PlanCreateRequest) => {
    const result = await apiPost<PlanResponse>('/plans', dto);
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/plans'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { create };
}

/** Update a membership plan and invalidate the plans list */
export function useUpdatePlan() {
  const update = useCallback(async (id: string, dto: PlanUpdateRequest) => {
    const result = await apiPatch<PlanResponse>(`/plans/${id}`, dto);
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/plans'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { update };
}

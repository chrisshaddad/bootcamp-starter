'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  GoalListResponse,
  GoalResponse,
  GoalCreateRequest,
  GoalUpdateRequest,
} from '@repo/contracts';

export function useGoals(options: { activeOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (options.activeOnly) params.set('activeOnly', 'true');

  const endpoint = `/goals${params.toString() ? `?${params}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<GoalListResponse>(endpoint);

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/goals'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const createGoal = useCallback(
    async (data: GoalCreateRequest): Promise<GoalResponse> => {
      const result = await apiPost<GoalResponse>('/goals', data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const updateGoal = useCallback(
    async (id: string, data: GoalUpdateRequest): Promise<GoalResponse> => {
      const result = await apiPatch<GoalResponse>(`/goals/${id}`, data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const deleteGoal = useCallback(
    async (id: string): Promise<void> => {
      await apiDelete(`/goals/${id}`);
      invalidate();
    },
    [invalidate],
  );

  return {
    goals: data?.goals,
    meta: data?.meta,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    mutate: invalidate,
  };
}

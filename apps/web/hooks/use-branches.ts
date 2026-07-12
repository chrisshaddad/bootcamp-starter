'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import type {
  BranchCreateRequest,
  BranchListResponse,
  BranchResponse,
  BranchUpdateRequest,
} from '@repo/contracts';

/**
 * Fetch the caller pharmacy's branches. The API always scopes to the caller's
 * pharmacyId. Mirrors the read pattern in `use-employees.ts`.
 */
export function useBranches({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, error, isLoading, mutate } = useSWR<BranchListResponse>(
    enabled ? '/branches' : null,
  );

  return {
    branches: data?.branches,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Mutations for the branches console. Revalidates every cached `/branches`
 * query after a successful write.
 */
export function useBranchActions() {
  const revalidateLists = useCallback(
    () =>
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/branches'),
      ),
    [],
  );

  const createBranch = useCallback(
    async (data: BranchCreateRequest): Promise<BranchResponse> => {
      const result = await apiPost<BranchResponse>('/branches', data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const updateBranch = useCallback(
    async (id: string, data: BranchUpdateRequest): Promise<BranchResponse> => {
      const result = await apiPatch<BranchResponse>(`/branches/${id}`, data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const deleteBranch = useCallback(
    async (id: string): Promise<{ id: string }> => {
      const result = await apiDelete<{ id: string }>(`/branches/${id}`);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  return { createBranch, updateBranch, deleteBranch };
}

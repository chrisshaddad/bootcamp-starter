'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiDelete } from '@/lib/api';
import type {
  CareerPathListResponse,
  CareerPathResponse,
  CareerPathCreateRequest,
} from '@repo/contracts';

interface UseCareerPathsReturn {
  careerPaths: CareerPathListResponse['careerPaths'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the current user's career paths
 */
export function useCareerPaths(): UseCareerPathsReturn {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<CareerPathListResponse>('/career-paths');

  return {
    careerPaths: data?.careerPaths,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseCareerPathMutationsReturn {
  createCareerPath: (
    data: CareerPathCreateRequest,
  ) => Promise<CareerPathResponse>;
  deleteCareerPath: (id: string) => Promise<void>;
}

/**
 * Hook for creating and deleting career paths.
 * Invalidates all cached `/career-paths` data after each mutation.
 */
export function useCareerPathMutations(): UseCareerPathMutationsReturn {
  const invalidateAll = useCallback(() => {
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/career-paths'),
      undefined,
      { revalidate: true },
    );
  }, []);

  const createCareerPath = useCallback(
    async (data: CareerPathCreateRequest) => {
      const result = await apiPost<CareerPathResponse>('/career-paths', data);
      invalidateAll();
      return result;
    },
    [invalidateAll],
  );

  const deleteCareerPath = useCallback(
    async (id: string) => {
      await apiDelete(`/career-paths/${id}`);
      invalidateAll();
    },
    [invalidateAll],
  );

  return { createCareerPath, deleteCareerPath };
}

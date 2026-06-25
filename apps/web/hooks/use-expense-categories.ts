'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  ExpenseCategoryResponse,
  ExpenseCategoryCreateRequest,
} from '@repo/contracts';

export function useExpenseCategories() {
  const endpoint = '/expense-categories';

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<ExpenseCategoryResponse[]>(endpoint);

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/expense-categories'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const createCategory = useCallback(
    async (
      data: ExpenseCategoryCreateRequest,
    ): Promise<ExpenseCategoryResponse> => {
      const result = await apiPost<ExpenseCategoryResponse>(
        '/expense-categories',
        data,
      );
      invalidate();
      return result;
    },
    [invalidate],
  );

  const updateCategory = useCallback(
    async (
      id: string,
      data: Partial<ExpenseCategoryCreateRequest>,
    ): Promise<ExpenseCategoryResponse> => {
      const result = await apiPatch<ExpenseCategoryResponse>(
        `/expense-categories/${id}`,
        data,
      );
      invalidate();
      return result;
    },
    [invalidate],
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      await apiDelete(`/expense-categories/${id}`);
      invalidate();
    },
    [invalidate],
  );

  const seedDefaults = useCallback(async (): Promise<void> => {
    await apiPost('/expense-categories/seed-defaults');
    invalidate();
  }, [invalidate]);

  return {
    categories: data,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    seedDefaults,
    mutate: invalidate,
  };
}

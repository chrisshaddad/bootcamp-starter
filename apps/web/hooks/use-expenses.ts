'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  ExpenseListResponse,
  ExpenseResponse,
  ExpenseCreateRequest,
  ExpenseUpdateRequest,
} from '@repo/contracts';

interface UseExpensesOptions {
  page?: number;
  limit?: number;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.categoryId) params.set('categoryId', options.categoryId);
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);
  if (options.search) params.set('search', options.search);

  const endpoint = `/expenses${params.toString() ? `?${params}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<ExpenseListResponse>(endpoint);

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/expenses'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const createExpense = useCallback(
    async (data: ExpenseCreateRequest): Promise<ExpenseResponse> => {
      const result = await apiPost<ExpenseResponse>('/expenses', data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const updateExpense = useCallback(
    async (
      id: string,
      data: ExpenseUpdateRequest,
    ): Promise<ExpenseResponse> => {
      const result = await apiPatch<ExpenseResponse>(`/expenses/${id}`, data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<void> => {
      await apiDelete(`/expenses/${id}`);
      invalidate();
    },
    [invalidate],
  );

  return {
    expenses: data?.expenses,
    meta: data?.meta,
    isLoading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    mutate: invalidate,
  };
}

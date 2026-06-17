'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  SaleListResponse,
  SaleResponse,
  SaleCreateRequest,
  SaleUpdateRequest,
} from '@repo/contracts';

interface UseSalesOptions {
  page?: number;
  limit?: number;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function useSales(options: UseSalesOptions = {}) {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.productId) params.set('productId', options.productId);
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);
  if (options.search) params.set('search', options.search);

  const endpoint = `/sales${params.toString() ? `?${params}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<SaleListResponse>(endpoint);

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/sales'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const createSale = useCallback(
    async (data: SaleCreateRequest): Promise<SaleResponse> => {
      const result = await apiPost<SaleResponse>('/sales', data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const updateSale = useCallback(
    async (id: string, data: SaleUpdateRequest): Promise<SaleResponse> => {
      const result = await apiPatch<SaleResponse>(`/sales/${id}`, data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const deleteSale = useCallback(
    async (id: string): Promise<void> => {
      await apiDelete(`/sales/${id}`);
      invalidate();
    },
    [invalidate],
  );

  return {
    sales: data?.sales,
    meta: data?.meta,
    isLoading,
    error,
    createSale,
    updateSale,
    deleteSale,
    mutate: invalidate,
  };
}

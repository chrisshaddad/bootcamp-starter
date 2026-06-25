'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  ProductListResponse,
  ProductResponse,
  ProductCreateRequest,
  ProductUpdateRequest,
} from '@repo/contracts';

export function useProducts(options: { activeOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (options.activeOnly) params.set('activeOnly', 'true');

  const endpoint = `/products${params.toString() ? `?${params}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<ProductListResponse>(endpoint);

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/products'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const createProduct = useCallback(
    async (data: ProductCreateRequest): Promise<ProductResponse> => {
      const result = await apiPost<ProductResponse>('/products', data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const updateProduct = useCallback(
    async (
      id: string,
      data: ProductUpdateRequest,
    ): Promise<ProductResponse> => {
      const result = await apiPatch<ProductResponse>(`/products/${id}`, data);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const deleteProduct = useCallback(
    async (id: string): Promise<void> => {
      await apiDelete(`/products/${id}`);
      invalidate();
    },
    [invalidate],
  );

  return {
    products: data?.products,
    meta: data?.meta,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    mutate: invalidate,
  };
}

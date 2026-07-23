'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import type {
  CartResponse,
  CartAddItemRequest,
  CheckoutResponse,
} from '@repo/contracts';

/**
 * Hook for the patron's persisted cart within the active library, plus
 * add/remove/checkout actions.
 */
export function usePortalCart(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<CartResponse>(enabled ? '/portal/cart' : null);

  const addItem = useCallback(async (data: CartAddItemRequest) => {
    const result = await apiPost<CartResponse>('/portal/cart/items', data);
    invalidateByPrefix('/portal/cart');
    return result;
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const result = await apiDelete<CartResponse>(
      `/portal/cart/items/${itemId}`,
    );
    invalidateByPrefix('/portal/cart');
    return result;
  }, []);

  const checkout = useCallback(async () => {
    const result = await apiPost<CheckoutResponse>('/portal/cart/checkout');
    invalidateByPrefix('/portal/cart');
    return result;
  }, []);

  return {
    cart: data,
    items: data?.items,
    isLoading,
    error,
    addItem,
    removeItem,
    checkout,
    mutate: swrMutate,
  };
}

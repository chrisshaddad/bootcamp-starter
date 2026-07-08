'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import type {
  MedicineCreateRequest,
  MedicineFacetsResponse,
  MedicineFilter,
  MedicineIngredientOptionsResponse,
  MedicineListResponse,
  MedicineResponse,
  MedicineStatsResponse,
  MedicineUpdateRequest,
} from '@repo/contracts';

interface UseMedicinesOptions extends MedicineFilter {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

interface UseMedicinesReturn {
  medicines: MedicineListResponse['medicines'] | undefined;
  total: number | undefined;
  page: number | undefined;
  pageSize: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

// Serialize the shared catalog filters into query params (skipping empties).
function appendFilters(params: URLSearchParams, filters: MedicineFilter): void {
  if (filters.search) params.set('search', filters.search);
  if (filters.type) params.set('type', filters.type);
  if (filters.form) params.set('form', filters.form);
  if (filters.dosage) params.set('dosage', filters.dosage);
  if (filters.hasPrice) params.set('hasPrice', filters.hasPrice);
  if (filters.hasBarcode) params.set('hasBarcode', filters.hasBarcode);
}

/**
 * Hook for fetching the paginated medicine catalog with search + filters.
 * Mirrors the read pattern in `use-users.ts`.
 */
export function useMedicines(
  options: UseMedicinesOptions = {},
): UseMedicinesReturn {
  const { page = 1, pageSize = 20, enabled = true, ...filters } = options;

  const params = new URLSearchParams();
  appendFilters(params, filters);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const endpoint = `/medicines?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<MedicineListResponse>(enabled ? endpoint : null);

  return {
    medicines: data?.medicines,
    total: data?.total,
    page: data?.page,
    pageSize: data?.pageSize,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Distinct filter values for the cascading dropdowns, given the filters already
 * applied. Refetches whenever a selection changes so the options stay coherent.
 */
export function useMedicineFacets(filters: MedicineFilter = {}) {
  const params = new URLSearchParams();
  appendFilters(params, filters);
  const query = params.toString();
  const endpoint = query ? `/medicines/facets?${query}` : '/medicines/facets';

  const { data, error, isLoading } = useSWR<MedicineFacetsResponse>(endpoint);
  return { facets: data, isLoading, error };
}

/**
 * Distinct free-text ingredient strings already in the catalog, for the
 * creatable ingredients combobox in the add/edit form. Separate endpoint from
 * facets so it never slows the cascading table filters.
 */
export function useMedicineIngredientOptions() {
  const { data, error, isLoading } = useSWR<MedicineIngredientOptionsResponse>(
    '/medicines/ingredients',
  );
  return { ingredients: data?.ingredients, isLoading, error };
}

/**
 * Catalog-wide summary counts for the header cards. Independent of the current
 * page/search, so the totals stay accurate as the user browses.
 */
export function useMedicineStats() {
  const { data, error, isLoading } =
    useSWR<MedicineStatsResponse>('/medicines/stats');
  return { stats: data, isLoading, error };
}

/**
 * Actions for mutating the medicine catalog. Revalidates every cached
 * `/medicines` list (all search/page combinations) and the stats card after a
 * successful write.
 */
export function useMedicineActions() {
  const revalidateLists = useCallback(() => {
    return globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/medicines'),
    );
  }, []);

  const createMedicine = useCallback(
    async (data: MedicineCreateRequest): Promise<MedicineResponse> => {
      const result = await apiPost<MedicineResponse>('/medicines', data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const updateMedicine = useCallback(
    async (
      id: string,
      data: MedicineUpdateRequest,
    ): Promise<MedicineResponse> => {
      const result = await apiPatch<MedicineResponse>(`/medicines/${id}`, data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const deleteMedicine = useCallback(
    async (id: string): Promise<MedicineResponse> => {
      const result = await apiDelete<MedicineResponse>(`/medicines/${id}`);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  return { createMedicine, updateMedicine, deleteMedicine };
}

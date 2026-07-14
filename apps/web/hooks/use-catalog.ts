'use client';

import useSWR from 'swr';
import type {
  MedicineListQuery,
  MedicineListResponse,
  MedicineResponse,
} from '@repo/contracts';

/**
 * Browse/search the global medicine catalog (GET /catalog/medicines). The
 * catalog is global and read-only for clients; `search` matches the medicine
 * name, paginated server-side.
 */
export function useCatalog(query: Partial<MedicineListQuery> = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.type) params.set('type', query.type);
  if (query.form) params.set('form', query.form);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();

  const { data, error, isLoading } = useSWR<MedicineListResponse>(
    `/catalog/medicines${qs ? `?${qs}` : ''}`,
  );

  return {
    medicines: data?.medicines,
    total: data?.total,
    page: data?.page,
    pageSize: data?.pageSize,
    isLoading,
    error,
  };
}

/** One medicine's full catalog record (GET /catalog/medicines/:id). */
export function useMedicine(id: string | undefined) {
  const { data, error, isLoading } = useSWR<MedicineResponse>(
    id ? `/catalog/medicines/${id}` : null,
  );
  return { medicine: data, isLoading, error };
}

/**
 * Ingredient-based alternatives for a medicine
 * (GET /catalog/medicines/:id/alternatives) — other medicines that share an
 * active ingredient, for finding a substitute/generic.
 */
export function useMedicineAlternatives(id: string | undefined) {
  const { data, error, isLoading } = useSWR<MedicineResponse[]>(
    id ? `/catalog/medicines/${id}/alternatives` : null,
  );
  return { alternatives: data, isLoading, error };
}

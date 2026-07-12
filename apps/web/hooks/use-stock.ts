'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost, fetcher } from '@/lib/api';
import type {
  MedicineCreateRequest,
  StockBatchCreateRequest,
  StockBatchResponse,
  StockBatchUpdateRequest,
  StockAttributesResponse,
  StockBranchOptionsResponse,
  StockCatalogItem,
  StockCatalogResponse,
  StockListResponse,
  StockMedicineDetailResponse,
} from '@repo/contracts';

interface UseStockOptions {
  branchId?: string;
  search?: string;
  enabled?: boolean;
}

/**
 * Per-branch inventory summary. The API always resolves the branch from the
 * session (a stock manager's own branch, or the admin's chosen/default branch);
 * `branchId` here just tells the admin which branch to view. Mirrors the read
 * pattern in `use-employees.ts`.
 */
export function useStock(options: UseStockOptions = {}) {
  const { branchId, search, enabled = true } = options;

  const params = new URLSearchParams();
  if (branchId) params.set('branchId', branchId);
  if (search) params.set('search', search);
  const query = params.toString();
  const endpoint = query ? `/stock?${query}` : '/stock';

  const { data, error, isLoading, mutate } = useSWR<StockListResponse>(
    enabled ? endpoint : null,
  );

  return {
    branchId: data?.branchId,
    branchName: data?.branchName,
    medicines: data?.medicines,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Distinct medicine attribute values (forms, dosages, types) already in the
 * catalog, for the "pick existing or type new" comboboxes on the add-medicine
 * form.
 */
export function useStockAttributes() {
  const { data, error, isLoading } =
    useSWR<StockAttributesResponse>('/stock/attributes');
  return { attributes: data, isLoading, error };
}

/** Branches the caller may view/manage stock for (for the branch picker). */
export function useStockBranches() {
  const { data, error, isLoading, mutate } =
    useSWR<StockBranchOptionsResponse>('/stock/branches');
  return { branches: data, isLoading, error, mutate };
}

/** Every batch of one medicine at the resolved branch, with the running total. */
export function useStockMedicineDetail(
  medicineId: string,
  branchId?: string,
  enabled = true,
) {
  const params = new URLSearchParams();
  if (branchId) params.set('branchId', branchId);
  const query = params.toString();
  const endpoint = query
    ? `/stock/medicines/${medicineId}?${query}`
    : `/stock/medicines/${medicineId}`;

  const { data, error, isLoading, mutate } =
    useSWR<StockMedicineDetailResponse>(enabled ? endpoint : null);

  return { detail: data, isLoading, error, mutate };
}

/**
 * Search the global medicine catalog for the add-batch picker. This is an
 * on-demand lookup (typed query or scanned barcode), not a subscription, so it
 * fetches imperatively instead of via a `useSWR` key.
 */
export function searchStockCatalog(params: {
  search?: string;
  barcode?: string;
}): Promise<StockCatalogResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.barcode) query.set('barcode', params.barcode);
  return fetcher<StockCatalogResponse>(`/stock/catalog?${query.toString()}`);
}

/**
 * Mutations for the stock console. Revalidates every cached `/stock` key (all
 * branch/search combinations, plus the per-medicine detail views) after a write
 * so totals and batch lists refresh everywhere.
 */
export function useStockActions() {
  const revalidate = useCallback(
    () =>
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/stock'),
      ),
    [],
  );

  const createBatch = useCallback(
    async (data: StockBatchCreateRequest): Promise<StockBatchResponse> => {
      const result = await apiPost<StockBatchResponse>('/stock/batches', data);
      await revalidate();
      return result;
    },
    [revalidate],
  );

  const updateBatch = useCallback(
    async (
      id: string,
      data: StockBatchUpdateRequest,
    ): Promise<StockBatchResponse> => {
      const result = await apiPatch<StockBatchResponse>(
        `/stock/batches/${id}`,
        data,
      );
      await revalidate();
      return result;
    },
    [revalidate],
  );

  const deleteBatch = useCallback(
    async (id: string): Promise<StockBatchResponse> => {
      const result = await apiDelete<StockBatchResponse>(
        `/stock/batches/${id}`,
      );
      await revalidate();
      return result;
    },
    [revalidate],
  );

  const createMedicine = useCallback(
    async (data: MedicineCreateRequest): Promise<StockCatalogItem> => {
      // No `/stock` list depends on the catalog until a batch is added, so this
      // doesn't revalidate on its own — the follow-up createBatch does.
      return apiPost<StockCatalogItem>('/stock/catalog', data);
    },
    [],
  );

  return { createBatch, updateBatch, deleteBatch, createMedicine };
}

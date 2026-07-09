'use client';

import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import type {
  BranchCreateRequest,
  BranchUpdateRequest,
  PharmacyAdminListItem,
  PharmacyAdminListResponse,
  PharmacyCreateRequest,
  PharmacyDetailResponse,
  PharmacyListResponse,
  PharmacyOption,
} from '@repo/contracts';

interface UsePharmaciesReturn {
  pharmacies: PharmacyOption[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * All pharmacies, for selection dropdowns. Revalidates on mount and on window
 * focus so the list stays current — a pharmacy added elsewhere shows up the
 * next time a dialog opens or the tab is refocused, without a manual reload.
 */
export function usePharmacies(enabled = true): UsePharmaciesReturn {
  const { data, error, isLoading } = useSWR<PharmacyListResponse>(
    enabled ? '/pharmacies' : null,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateIfStale: true,
    },
  );

  return { pharmacies: data?.pharmacies, isLoading, error };
}

interface UsePharmacyAdminListReturn {
  pharmacies: PharmacyAdminListItem[] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Rich pharmacy list for the super-admin console — each row carries live
 * branch / admin / user counts. Separate from `usePharmacies` (the id+name
 * dropdown feed) so the two views don't share a cache key.
 */
export function usePharmacyAdminList(): UsePharmacyAdminListReturn {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PharmacyAdminListResponse>('/pharmacies/admin');

  return {
    pharmacies: data?.pharmacies,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UsePharmacyDetailReturn {
  pharmacy: PharmacyDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * One pharmacy with its branches and users, for the detail page. Keyed by id so
 * each pharmacy has its own cache entry; passing `undefined` disables the fetch.
 */
export function usePharmacyDetail(
  id: string | undefined,
): UsePharmacyDetailReturn {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PharmacyDetailResponse>(id ? `/pharmacies/${id}` : null);

  return { pharmacy: data, isLoading, error, mutate: swrMutate };
}

/**
 * Actions for the pharmacies console. Every mutation revalidates all cached
 * `/pharmacies*` entries (the console list, each detail view, and the dropdown
 * feeds) so counts and lists stay consistent. Detail-returning mutations also
 * seed the detail cache with the fresh payload for an instant update.
 */
export function usePharmacyActions() {
  const revalidate = useCallback(() => {
    return globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/pharmacies'),
    );
  }, []);

  const seedDetail = useCallback(
    async (pharmacyId: string, detail: PharmacyDetailResponse) => {
      await globalMutate(`/pharmacies/${pharmacyId}`, detail, {
        revalidate: false,
      });
    },
    [],
  );

  const createPharmacy = useCallback(
    async (data: PharmacyCreateRequest): Promise<PharmacyAdminListResponse> => {
      const result = await apiPost<PharmacyAdminListResponse>(
        '/pharmacies',
        data,
      );
      await revalidate();
      return result;
    },
    [revalidate],
  );

  const deletePharmacy = useCallback(
    async (id: string): Promise<PharmacyAdminListResponse> => {
      const result = await apiDelete<PharmacyAdminListResponse>(
        `/pharmacies/${id}`,
      );
      await revalidate();
      return result;
    },
    [revalidate],
  );

  const addBranch = useCallback(
    async (
      pharmacyId: string,
      data: BranchCreateRequest,
    ): Promise<PharmacyDetailResponse> => {
      const result = await apiPost<PharmacyDetailResponse>(
        `/pharmacies/${pharmacyId}/branches`,
        data,
      );
      await seedDetail(pharmacyId, result);
      await revalidate();
      return result;
    },
    [revalidate, seedDetail],
  );

  const updateBranch = useCallback(
    async (
      pharmacyId: string,
      branchId: string,
      data: BranchUpdateRequest,
    ): Promise<PharmacyDetailResponse> => {
      const result = await apiPatch<PharmacyDetailResponse>(
        `/pharmacies/${pharmacyId}/branches/${branchId}`,
        data,
      );
      await seedDetail(pharmacyId, result);
      await revalidate();
      return result;
    },
    [revalidate, seedDetail],
  );

  const deleteBranch = useCallback(
    async (
      pharmacyId: string,
      branchId: string,
    ): Promise<PharmacyDetailResponse> => {
      const result = await apiDelete<PharmacyDetailResponse>(
        `/pharmacies/${pharmacyId}/branches/${branchId}`,
      );
      await seedDetail(pharmacyId, result);
      await revalidate();
      return result;
    },
    [revalidate, seedDetail],
  );

  const assignUserBranch = useCallback(
    async (
      pharmacyId: string,
      userId: string,
      branchId: string | null,
    ): Promise<PharmacyDetailResponse> => {
      const result = await apiPatch<PharmacyDetailResponse>(
        `/pharmacies/${pharmacyId}/users/${userId}/branch`,
        { branchId },
      );
      await seedDetail(pharmacyId, result);
      await revalidate();
      return result;
    },
    [revalidate, seedDetail],
  );

  return {
    createPharmacy,
    deletePharmacy,
    addBranch,
    updateBranch,
    deleteBranch,
    assignUserBranch,
  };
}

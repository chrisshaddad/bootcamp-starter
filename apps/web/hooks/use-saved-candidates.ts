'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete, fetcher } from '@/lib/api';
import type {
  SavedCandidateResponse,
  SavedCandidatesListResponse,
  CandidateStatus,
} from '@repo/contracts';

const KEY = '/saved-candidates';

export function useSavedCandidates() {
  const { data, error, isLoading, mutate } =
    useSWR<SavedCandidatesListResponse>(KEY, fetcher);
  return { savedCandidates: data?.data ?? [], error, isLoading, mutate };
}

export function useSaveCandidate() {
  return useCallback(async (candidateId: string, note?: string) => {
    const res = await apiPost<SavedCandidateResponse>(KEY, {
      candidateId,
      note,
    });
    await globalMutate(KEY);
    return res;
  }, []);
}

export function useUnsaveCandidate() {
  return useCallback(async (candidateId: string) => {
    await apiDelete(`${KEY}/${candidateId}`);
    await globalMutate(KEY);
  }, []);
}

export function useUpdateCandidate() {
  return useCallback(
    async (
      candidateId: string,
      status?: CandidateStatus,
      note?: string | null,
    ) => {
      const res = await apiPatch<SavedCandidateResponse>(
        `${KEY}/${candidateId}`,
        { status, note },
      );
      await globalMutate(KEY);
      return res;
    },
    [],
  );
}

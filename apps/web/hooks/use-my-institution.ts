'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type {
  InstitutionDetailResponse,
  InstitutionUpdateRequest,
} from '@repo/contracts';

/** The caller's own institution (Institution Admin / Staff / Professional). */
export function useMyInstitution(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { data, error, isLoading, mutate } = useSWR<InstitutionDetailResponse>(
    enabled ? '/institutions/me' : null,
  );

  const updateInstitution = useCallback(
    async (payload: InstitutionUpdateRequest) => {
      const result = await apiPatch<InstitutionDetailResponse>(
        '/institutions/me',
        payload,
      );
      mutate();
      return result;
    },
    [mutate],
  );

  return {
    institution: data,
    isLoading,
    error,
    updateInstitution,
    mutate,
  };
}

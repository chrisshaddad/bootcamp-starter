'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost } from '@/lib/api';
import type {
  ImportListResponse,
  ImportResponse,
  ImportRowListResponse,
  ImportType,
} from '@repo/contracts';

const ACTIVE_STATUSES = new Set(['PENDING', 'PROCESSING']);

export function useImports(options: { page?: number } = {}) {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));

  const endpoint = `/imports${params.toString() ? `?${params}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<ImportListResponse>(endpoint, {
    // Poll every 2 s while any import is still processing; stop when all settle
    refreshInterval: (latestData) => {
      const hasActive = latestData?.imports?.some((i) =>
        ACTIVE_STATUSES.has(i.status),
      );
      return hasActive ? 2000 : 0;
    },
  });

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/imports'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const uploadImport = useCallback(
    async (params: {
      type: ImportType;
      fileName: string;
      fileContent: string; // base64
      columnMapping: Record<string, string>;
    }): Promise<ImportResponse> => {
      const result = await apiPost<ImportResponse>('/imports', params);
      invalidate();
      return result;
    },
    [invalidate],
  );

  const reprocess = useCallback(
    async (id: string): Promise<ImportResponse> => {
      const result = await apiPost<ImportResponse>(`/imports/${id}/reprocess`);
      invalidate();
      return result;
    },
    [invalidate],
  );

  return {
    imports: data?.imports,
    meta: data?.meta,
    isLoading,
    error,
    uploadImport,
    reprocess,
    mutate: invalidate,
  };
}

export function useImportRows(
  importId: string | null,
  options: { page?: number; status?: string; importStatus?: string } = {},
) {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.status) params.set('status', options.status);

  const endpoint = importId
    ? `/imports/${importId}/rows${params.toString() ? `?${params}` : ''}`
    : null;

  const isActive = options.importStatus
    ? ACTIVE_STATUSES.has(options.importStatus)
    : false;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<ImportRowListResponse>(endpoint, {
    refreshInterval: isActive ? 2000 : 0,
  });

  return {
    rows: data?.rows,
    meta: data?.meta,
    isLoading,
    error,
    mutate: revalidate,
  };
}

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost, apiUpload, API_URL } from '@/lib/api';
import {
  DEFAULT_PAGE_SIZE,
  type RecordListResponse,
  type RecordDetailResponse,
  type RecordFileResponse,
  type RecordCreateRequest,
  type RecordType,
} from '@repo/contracts';

/** Records timeline for a patient. */
export function useRecords(
  patientId: string,
  options: {
    recordTypes?: RecordType[];
    page?: number;
    limit?: number;
    enabled?: boolean;
  } = {},
) {
  const { recordTypes, page, limit, enabled = true } = options;
  const params = new URLSearchParams();
  recordTypes?.forEach((type) => params.append('recordType', type));
  if (page && page > 1) params.set('page', String(page));
  if (limit && limit !== DEFAULT_PAGE_SIZE) params.set('limit', String(limit));
  const qs = params.toString();
  const key = qs
    ? `/patients/${patientId}/records?${qs}`
    : `/patients/${patientId}/records`;

  const { data, error, isLoading, mutate } = useSWR<RecordListResponse>(
    enabled ? key : null,
  );

  const createRecord = useCallback(
    async (payload: RecordCreateRequest) => {
      const result = await apiPost<RecordDetailResponse>(
        `/patients/${patientId}/records`,
        payload,
      );
      mutate();
      return result;
    },
    [patientId, mutate],
  );

  return {
    records: data?.records,
    total: data?.total,
    isLoading,
    error,
    createRecord,
    mutate,
  };
}

/** A single record with its typed detail + attachments. */
export function useRecord(
  id: string | null,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { data, error, isLoading, mutate } = useSWR<RecordDetailResponse>(
    enabled && id ? `/records/${id}` : null,
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!id) throw new Error('No record selected');
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiUpload<RecordFileResponse>(
        `/records/${id}/files`,
        formData,
      );
      mutate();
      // Also refresh the patient's records list so its fileCount isn't stale.
      if (data?.patientId) {
        globalMutate(
          (key) =>
            typeof key === 'string' &&
            key.startsWith(`/patients/${data.patientId}/records`),
        );
      }
      return result;
    },
    [id, mutate, data?.patientId],
  );

  const updateRecord = useCallback(
    async (payload: RecordCreateRequest) => {
      if (!id) throw new Error('No record selected');
      const result = await apiPatch<RecordDetailResponse>(
        `/records/${id}`,
        payload,
      );
      mutate();
      // Also refresh the patient's records list so its title/type isn't stale.
      if (data?.patientId) {
        globalMutate(
          (key) =>
            typeof key === 'string' &&
            key.startsWith(`/patients/${data.patientId}/records`),
        );
      }
      return result;
    },
    [id, mutate, data?.patientId],
  );

  const deleteRecord = useCallback(async () => {
    if (!id) throw new Error('No record selected');
    await apiDelete(`/records/${id}`);
    // No mutate() on the (now-deleted) record itself — the caller closes the
    // detail view. Just refresh the patient's records list so it disappears.
    if (data?.patientId) {
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith(`/patients/${data.patientId}/records`),
      );
    }
  }, [id, data?.patientId]);

  return {
    record: data,
    isLoading,
    error,
    uploadFile,
    updateRecord,
    deleteRecord,
    mutate,
  };
}

/** Absolute URL for downloading a record attachment (opened in a new tab). */
export function recordFileDownloadUrl(
  recordId: string,
  fileId: string,
): string {
  return `${API_URL}/records/${recordId}/files/${fileId}/download`;
}

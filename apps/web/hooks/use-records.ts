'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiUpload, API_URL } from '@/lib/api';
import type {
  RecordListResponse,
  RecordDetailResponse,
  RecordFileResponse,
  RecordCreateRequest,
  RecordType,
} from '@repo/contracts';

/** Records timeline for a patient. */
export function useRecords(
  patientId: string,
  options: { recordType?: RecordType; enabled?: boolean } = {},
) {
  const { recordType, enabled = true } = options;
  const key = recordType
    ? `/patients/${patientId}/records?recordType=${recordType}`
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

  return {
    record: data,
    isLoading,
    error,
    uploadFile,
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

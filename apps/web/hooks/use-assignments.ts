'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  AssignmentListResponse,
  AssignmentResponse,
  AssignmentCreateRequest,
} from '@repo/contracts';

/**
 * Care team for a patient. `onChange` is called after mutations so the caller
 * can also refresh the patient detail (which embeds the care team).
 */
export function useAssignments(
  patientId: string,
  options: { enabled?: boolean; onChange?: () => void } = {},
) {
  const { enabled = true, onChange } = options;
  const key = `/assignments?patientId=${patientId}`;

  const { data, error, isLoading, mutate } = useSWR<AssignmentListResponse>(
    enabled ? key : null,
  );

  const assignProfessional = useCallback(
    async (professionalId: string) => {
      const payload: AssignmentCreateRequest = { patientId, professionalId };
      const result = await apiPost<AssignmentResponse>('/assignments', payload);
      mutate();
      onChange?.();
      return result;
    },
    [patientId, mutate, onChange],
  );

  const removeAssignment = useCallback(
    async (assignmentId: string) => {
      const result = await apiPatch<AssignmentResponse>(
        `/assignments/${assignmentId}/deactivate`,
      );
      mutate();
      onChange?.();
      return result;
    },
    [mutate, onChange],
  );

  return {
    assignments: data?.assignments,
    isLoading,
    error,
    assignProfessional,
    removeAssignment,
    mutate,
  };
}

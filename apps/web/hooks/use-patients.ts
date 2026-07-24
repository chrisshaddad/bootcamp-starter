'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import {
  DEFAULT_PAGE_SIZE,
  type PatientListResponse,
  type PatientDetailResponse,
  type PatientCreateRequest,
  type PatientAdminUpdateRequest,
  type PatientClinicalUpdateRequest,
  type UserStatusRequest,
} from '@repo/contracts';

interface UsePatientsOptions {
  search?: string;
  unassigned?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

function buildPatientsKey(options: UsePatientsOptions): string {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.unassigned) params.set('unassigned', 'true');
  if (options.page && options.page > 1)
    params.set('page', String(options.page));
  if (options.limit && options.limit !== DEFAULT_PAGE_SIZE)
    params.set('limit', String(options.limit));
  const qs = params.toString();
  return qs ? `/patients?${qs}` : '/patients';
}

function invalidatePatientsList() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/patients'),
    undefined,
    { revalidate: true },
  );
}

export function usePatients(options: UsePatientsOptions = {}) {
  const { enabled = true } = options;
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PatientListResponse>(enabled ? buildPatientsKey(options) : null);

  return {
    patients: data?.patients,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

export function useCreatePatient() {
  const createPatient = useCallback(async (data: PatientCreateRequest) => {
    const result = await apiPost<PatientDetailResponse>('/patients', data);
    invalidatePatientsList();
    return result;
  }, []);

  return { createPatient };
}

/**
 * Standalone clinical update — used at patient-creation time (the stepper's
 * optional Clinical step) where there is no per-id `usePatient` hook yet.
 */
export function useUpdatePatientClinical() {
  const updatePatientClinical = useCallback(
    async (id: string, payload: PatientClinicalUpdateRequest) => {
      const result = await apiPatch<PatientDetailResponse>(
        `/patients/${id}/clinical`,
        payload,
      );
      invalidatePatientsList();
      return result;
    },
    [],
  );

  return { updatePatientClinical };
}

export function useSetPatientStatus() {
  const setPatientStatus = useCallback(
    async (id: string, isActive: boolean) => {
      const payload: UserStatusRequest = { isActive };
      const result = await apiPatch<PatientDetailResponse>(
        `/patients/${id}/status`,
        payload,
      );
      invalidatePatientsList();
      return result;
    },
    [],
  );

  return { setPatientStatus };
}

export function usePatient(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PatientDetailResponse>(enabled ? `/patients/${id}` : null);

  const updateAdmin = useCallback(
    async (payload: PatientAdminUpdateRequest) => {
      const result = await apiPatch<PatientDetailResponse>(
        `/patients/${id}/admin`,
        payload,
      );
      swrMutate();
      invalidatePatientsList();
      return result;
    },
    [id, swrMutate],
  );

  const updateClinical = useCallback(
    async (payload: PatientClinicalUpdateRequest) => {
      const result = await apiPatch<PatientDetailResponse>(
        `/patients/${id}/clinical`,
        payload,
      );
      swrMutate();
      return result;
    },
    [id, swrMutate],
  );

  return {
    patient: data,
    isLoading,
    error,
    updateAdmin,
    updateClinical,
    mutate: swrMutate,
  };
}

/** Patient portal — the logged-in patient's own record. */
export function usePatientMe(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PatientDetailResponse>(enabled ? '/patients/me' : null);

  return {
    patient: data,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

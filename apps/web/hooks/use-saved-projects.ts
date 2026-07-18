// apps/web/hooks/use-saved-projects.ts
'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  SavedProjectsResponse,
  SavedProjectsListQuery,
  SavedProjectIdsResponse,
  SavedProjectResponse,
} from '@repo/contracts';

const SAVED_PROJECT_IDS_KEY = '/saved-projects/ids';
const isSavedProjectsKey = (key: unknown) =>
  typeof key === 'string' && key.startsWith('/saved-projects');

// real: GET /saved-projects/ids, recruiter-only. Only the id set — cheap
// enough to fetch on any project detail page to know whether to render the
// Save button as filled, without paginating the full saved list.
export function useSavedProjectIds(enabled: boolean) {
  const { data, error, isLoading } = useSWR<SavedProjectIdsResponse>(
    enabled ? SAVED_PROJECT_IDS_KEY : null,
  );

  return { savedProjectIds: data ?? [], error, isLoading };
}

// real: GET /saved-projects, recruiter-only. Paginated, shaped like the
// explore card list so the Saved Projects page can reuse ProjectCard as-is.
export function useSavedProjects(query?: Partial<SavedProjectsListQuery>) {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const { data, error, isLoading } = useSWR<SavedProjectsResponse>(
    `/saved-projects${queryString}`,
  );

  return { projects: data?.data ?? [], meta: data?.meta, error, isLoading };
}

export function useSaveProject() {
  return useCallback(async (projectId: string, note?: string) => {
    const saved = await apiPost<SavedProjectResponse>('/saved-projects', {
      projectId,
      note,
    });
    await globalMutate(isSavedProjectsKey);
    return saved;
  }, []);
}

export function useUnsaveProject() {
  return useCallback(async (projectId: string) => {
    await apiDelete<void>(`/saved-projects/${projectId}`);
    await globalMutate(isSavedProjectsKey);
  }, []);
}

export function useUpdateSavedProjectNote() {
  return useCallback(async (projectId: string, note: string | null) => {
    const saved = await apiPatch<SavedProjectResponse>(
      `/saved-projects/${projectId}`,
      { note },
    );
    await globalMutate(isSavedProjectsKey);
    return saved;
  }, []);
}

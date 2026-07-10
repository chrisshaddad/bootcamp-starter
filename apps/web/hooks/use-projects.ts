'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
} from '@repo/contracts';

const PROJECTS_KEY = '/projects';
const projectKey = (id: string) => `/projects/id/${id}`;

// real: GET /projects, list of projects owned by the current user.
export function useProjects() {
  const { data, error, isLoading } = useSWR<ProjectResponse[]>(PROJECTS_KEY);
  return { projects: data ?? [], error, isLoading };
}

// real: GET /projects/id/:id, for prefilling edit forms.
export function useProject(id: string | undefined) {
  const { data, error, isLoading } = useSWR<ProjectResponse>(
    id ? projectKey(id) : null,
  );
  return { project: data, error, isLoading };
}

export function useCreateProject() {
  return useCallback(async (data: CreateProjectRequest) => {
    const project = await apiPost<ProjectResponse>('/projects', data);
    await globalMutate(PROJECTS_KEY);
    return project;
  }, []);
}

export function useUpdateProject() {
  return useCallback(async (id: string, data: UpdateProjectRequest) => {
    const project = await apiPatch<ProjectResponse>(`/projects/${id}`, data);
    await Promise.all([
      globalMutate(PROJECTS_KEY),
      globalMutate(projectKey(id)),
    ]);
    return project;
  }, []);
}

// real: GET /projects/slug/:slug, public, only returns PUBLISHED projects.
export function useProjectBySlug(slug: string | undefined) {
  const { data, error, isLoading } = useSWR<ProjectResponse>(
    slug ? `/projects/slug/${slug}` : null,
  );

  return { project: data, error, isLoading };
}

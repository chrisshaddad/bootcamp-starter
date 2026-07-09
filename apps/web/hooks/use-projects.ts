'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
} from '@repo/contracts';
import {
  MOCK_PROJECTS,
  type MockProjectCard,
  type MockTechnology,
} from '@/lib/mock-projects';

const LOCAL_PROJECTS_KEY = 'local:projects';

export interface RealProjectCard extends ProjectResponse {
  isMock: false;
  repositoryFullName?: string;
  technologies?: MockTechnology[];
}

export type LocalProject = MockProjectCard | RealProjectCard;

async function seedLocalProjects(): Promise<LocalProject[]> {
  return MOCK_PROJECTS;
}

// mock: no GET /projects (list) endpoint yet. The grid reads from this
// client-only SWR cache, seeded with fixture data. Real projects created or
// updated via the real POST/PATCH calls below get merged into the same
// cache key so they show up immediately, without needing the list endpoint.
export function useProjects() {
  const { data, isLoading } = useSWR<LocalProject[]>(
    LOCAL_PROJECTS_KEY,
    seedLocalProjects,
    // revalidateOnMount would re-run the fetcher (which only knows the
    // static fixtures) on every mount, silently wiping out real projects
    // merged in by create/update below. Only fetch once, ever.
    { revalidateIfStale: false, revalidateOnFocus: false },
  );

  return { projects: data ?? [], isLoading };
}

// mock: no GET /projects/:id endpoint yet. Only resolves projects already
// known to this session (fixtures, or ones just created/updated for real).
export function useProject(id: string | undefined) {
  const { projects, isLoading } = useProjects();
  const project = id ? projects.find((p) => p.id === id) : undefined;
  return { project, isLoading };
}

export function useCreateProject() {
  return useCallback(async (data: CreateProjectRequest) => {
    const project = await apiPost<ProjectResponse>('/projects', data);
    const card: RealProjectCard = { ...project, isMock: false };

    await globalMutate<LocalProject[]>(
      LOCAL_PROJECTS_KEY,
      (current) => [card, ...(current ?? [])],
      { revalidate: false },
    );

    return project;
  }, []);
}

export function useUpdateProject() {
  return useCallback(async (id: string, data: UpdateProjectRequest) => {
    const project = await apiPatch<ProjectResponse>(`/projects/${id}`, data);
    const card: RealProjectCard = { ...project, isMock: false };

    await globalMutate<LocalProject[]>(
      LOCAL_PROJECTS_KEY,
      (current) => (current ?? []).map((p) => (p.id === id ? card : p)),
      { revalidate: false },
    );

    return project;
  }, []);
}

// real: GET /projects/:slug, public, only returns PUBLISHED projects.
export function useProjectBySlug(slug: string | undefined) {
  const { data, error, isLoading } = useSWR<ProjectResponse>(
    slug ? `/projects/${slug}` : null,
  );

  return { project: data, error, isLoading };
}

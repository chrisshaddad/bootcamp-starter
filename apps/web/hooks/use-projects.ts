// apps/web/hooks/use-projects.ts
'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete, apiUpload } from '@/lib/api';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
  ProjectByIdResponse,
  ProjectBySlugResponse,
  ProjectMediaUpdateRequest,
  ProjectMediaUploadRequest,
  ProjectMediaResponse,
  ExploreProjectsResponse,
} from '@repo/contracts';

const PROJECTS_KEY = '/projects';
const projectKey = (id: string) => `/projects/id/${id}`;

// real: GET /projects, list of projects owned by the current user. Includes
// media so the dashboard card grid can use each project's cover screenshot.
export function useProjects() {
  const { data, error, isLoading } =
    useSWR<ProjectByIdResponse[]>(PROJECTS_KEY);
  return { projects: data ?? [], error, isLoading };
}

// real: GET /projects/id/:id, for prefilling edit forms. Includes media.
export function useProject(id: string | undefined) {
  const { data, error, isLoading } = useSWR<ProjectByIdResponse>(
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

export function useDeleteProject() {
  return useCallback(async (id: string) => {
    await apiDelete<{ success: true }>(`/projects/${id}`);
    await globalMutate(PROJECTS_KEY);
  }, []);
}

// real: GET /projects/slug/:slug, public, only returns PUBLISHED projects.
// Includes media.
export function useProjectBySlug(slug: string | undefined) {
  const { data, error, isLoading } = useSWR<ProjectBySlugResponse>(
    slug ? `/projects/slug/${slug}` : null,
  );

  return { project: data, error, isLoading };
}

// projectId is a call-time argument (not hook-time) so this can also be used
// right after creating a project, in the same submit handler that obtains
// the new id — before any component has rendered with that id yet.
export function useUploadProjectMedia() {
  return useCallback(
    async (
      projectId: string,
      file: File,
      options?: Pick<ProjectMediaUploadRequest, 'caption' | 'sortOrder'>,
    ) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', 'IMAGE');
      if (options?.caption) formData.append('caption', options.caption);
      if (options?.sortOrder !== undefined) {
        formData.append('sortOrder', String(options.sortOrder));
      }

      const media = await apiUpload<ProjectMediaResponse>(
        `/projects/${projectId}/media`,
        formData,
      );
      await globalMutate(projectKey(projectId));
      return media;
    },
    [],
  );
}

// projectId is a call-time argument for the same reason as
// useUploadProjectMedia above — the new-project form uploads the logo right
// after creation, before any component has rendered with that id yet.
export function useUploadProjectLogo() {
  return useCallback(async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const project = await apiUpload<ProjectResponse>(
      `/projects/${projectId}/logo`,
      formData,
    );
    await Promise.all([
      globalMutate(PROJECTS_KEY),
      globalMutate(projectKey(projectId)),
    ]);
    return project;
  }, []);
}

export function useUpdateProjectMedia() {
  return useCallback(
    async (
      projectId: string,
      mediaId: string,
      data: ProjectMediaUpdateRequest,
    ) => {
      const media = await apiPatch<ProjectMediaResponse>(
        `/projects/${projectId}/media/${mediaId}`,
        data,
      );
      await globalMutate(projectKey(projectId));
      return media;
    },
    [],
  );
}

export function useSetCoverProjectMedia() {
  return useCallback(async (projectId: string, mediaId: string) => {
    const media = await apiPatch<ProjectMediaResponse>(
      `/projects/${projectId}/media/${mediaId}/set-cover`,
    );
    await globalMutate(projectKey(projectId));
    return media;
  }, []);
}

export function useDeleteProjectMedia() {
  return useCallback(async (projectId: string, mediaId: string) => {
    await apiDelete<{ success: true }>(
      `/projects/${projectId}/media/${mediaId}`,
    );
    await globalMutate(projectKey(projectId));
  }, []);
}
// New hook added for fetching Explore Projects
export function useExploreProjects(query?: { page?: number; limit?: number; search?: string; sort?: 'latest' | 'oldest' | 'alphabetical' }) {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  if (query?.search) params.append('search', query.search);
  if (query?.sort) params.append('sort', query.sort);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const { data, error, isLoading } = useSWR<ExploreProjectsResponse>(
    `/projects/explore${queryString}`
  );

  return { projects: data?.data ?? [], meta: data?.meta, error, isLoading };
}

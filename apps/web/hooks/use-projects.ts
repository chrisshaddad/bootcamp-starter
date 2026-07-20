// apps/web/hooks/use-projects.ts
'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete, apiUpload, fetcher } from '@/lib/api';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectByIdResponse,
  ProjectMediaUpdateRequest,
  ProjectMediaUploadRequest,
  ProjectsExploreQuery,
  ProjectsListQuery,
  SuccessResponse,
} from '@repo/contracts';
import {
  projectByIdResponseSchema,
  projectBySlugResponseSchema,
  projectMediaResponseSchema,
  projectResponseSchema,
  exploreProjectsResponseSchema,
  projectsListResponseSchema,
  successResponseSchema,
} from '@repo/contracts';

const PROJECTS_KEY = '/projects';
const projectKey = (id: string) => `/projects/id/${id}`;
const refreshProjectLists = () =>
  globalMutate(
    (key) =>
      typeof key === 'string' &&
      (key === PROJECTS_KEY || key.startsWith(`${PROJECTS_KEY}?`)),
  );

// real: GET /projects, list of projects owned by the current user. Includes
// media so the dashboard card grid can use each project's cover screenshot.
export function useProjects(
  query: ProjectsListQuery = { scope: 'ALL', page: 1, limit: 20 },
) {
  const params = new URLSearchParams({
    scope: query.scope,
    page: String(query.page),
    limit: String(query.limit),
  });
  const { data, error, isLoading } = useSWR(
    `${PROJECTS_KEY}?${params.toString()}`,
    async (key: string) => projectsListResponseSchema.parse(await fetcher(key)),
  );
  return { projects: data?.data ?? [], meta: data?.meta, error, isLoading };
}

// real: GET /projects/id/:id, for prefilling edit forms. Includes media.
export function useProject(id: string | undefined) {
  const { data, error, isLoading } = useSWR<ProjectByIdResponse>(
    id ? projectKey(id) : null,
    async (key: string) => projectByIdResponseSchema.parse(await fetcher(key)),
  );
  return { project: data, error, isLoading };
}

export function useCreateProject() {
  return useCallback(async (data: CreateProjectRequest) => {
    const project = projectResponseSchema.parse(
      await apiPost<unknown>('/projects', data),
    );
    await refreshProjectLists();
    return project;
  }, []);
}

export function useUpdateProject() {
  return useCallback(async (id: string, data: UpdateProjectRequest) => {
    const project = projectResponseSchema.parse(
      await apiPatch<unknown>(`/projects/${id}`, data),
    );
    await Promise.all([
      refreshProjectLists(),
      globalMutate(projectKey(id)),
      globalMutate(`/projects/slug/${project.slug}`),
    ]);
    return project;
  }, []);
}

export function useDeleteProject() {
  return useCallback(async (id: string) => {
    const response: SuccessResponse = successResponseSchema.parse(
      await apiDelete<unknown>(`/projects/${id}`),
    );
    await refreshProjectLists();
    return response;
  }, []);
}

// real: GET /projects/slug/:slug, public, only returns PUBLISHED projects.
// Includes media.
export function useProjectBySlug(slug: string | undefined) {
  const { data, error, isLoading } = useSWR(
    slug ? `/projects/slug/${slug}` : null,
    async (key: string) =>
      projectBySlugResponseSchema.parse(await fetcher(key)),
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

      const media = projectMediaResponseSchema.parse(
        await apiUpload<unknown>(`/projects/${projectId}/media`, formData),
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

    const project = projectResponseSchema.parse(
      await apiUpload<unknown>(`/projects/${projectId}/logo`, formData),
    );
    await Promise.all([
      refreshProjectLists(),
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
      const media = projectMediaResponseSchema.parse(
        await apiPatch<unknown>(
          `/projects/${projectId}/media/${mediaId}`,
          data,
        ),
      );
      await globalMutate(projectKey(projectId));
      return media;
    },
    [],
  );
}

export function useSetCoverProjectMedia() {
  return useCallback(async (projectId: string, mediaId: string) => {
    const media = projectMediaResponseSchema.parse(
      await apiPatch<unknown>(
        `/projects/${projectId}/media/${mediaId}/set-cover`,
      ),
    );
    await globalMutate(projectKey(projectId));
    return media;
  }, []);
}

export function useDeleteProjectMedia() {
  return useCallback(async (projectId: string, mediaId: string) => {
    const response: SuccessResponse = successResponseSchema.parse(
      await apiDelete<unknown>(`/projects/${projectId}/media/${mediaId}`),
    );
    await globalMutate(projectKey(projectId));
    return response;
  }, []);
}
// New hook added for fetching Explore Projects
export function useExploreProjects(query?: Partial<ProjectsExploreQuery>) {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  if (query?.search) params.append('search', query.search);
  if (query?.sort) params.append('sort', query.sort);
  query?.technology?.forEach((slug) => params.append('technology', slug));

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const { data, error, isLoading } = useSWR(
    `/projects/explore${queryString}`,
    async (key: string) =>
      exploreProjectsResponseSchema.parse(await fetcher(key)),
  );

  return { projects: data?.data ?? [], meta: data?.meta, error, isLoading };
}

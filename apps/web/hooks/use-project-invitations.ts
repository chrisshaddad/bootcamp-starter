'use client';

import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import type {
  CreateProjectInvitationRequest,
  ProjectInvitationListResponse,
  ProjectInvitationPendingCountResponse,
  ProjectInvitationListQuery,
} from '@repo/contracts';
import {
  projectCollaboratorSearchResponseSchema,
  projectInvitationListResponseSchema,
  projectInvitationPendingCountResponseSchema,
  projectInvitationResponseSchema,
} from '@repo/contracts';
import { apiDelete, apiPost, fetcher } from '@/lib/api';

const PENDING_COUNT_KEY = '/project-invitations/pending-count';
const DEFAULT_LIST_QUERY = { page: 1, limit: 20 } satisfies Pick<
  ProjectInvitationListQuery,
  'page' | 'limit'
>;

function invitationListQueryString(
  query: Partial<ProjectInvitationListQuery>,
): string {
  const resolved = { ...DEFAULT_LIST_QUERY, ...query };
  const params = new URLSearchParams({
    page: String(resolved.page),
    limit: String(resolved.limit),
  });
  if (resolved.status) params.set('status', resolved.status);
  return params.toString();
}

const inboxKey = (query: Partial<ProjectInvitationListQuery> = {}) =>
  `/project-invitations?${invitationListQueryString(query)}`;
const ownerInvitationsKey = (
  projectId: string,
  query: Partial<ProjectInvitationListQuery> = {},
) => `/projects/${projectId}/invitations?${invitationListQueryString(query)}`;

async function refreshInvitationData(projectId?: string, projectSlug?: string) {
  const keys: Array<Promise<unknown>> = [
    globalMutate(
      (key) =>
        typeof key === 'string' && key.startsWith('/project-invitations?'),
    ),
    globalMutate(PENDING_COUNT_KEY),
  ];
  if (projectId) {
    keys.push(
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith(`/projects/${projectId}/invitations?`),
      ),
    );
    keys.push(globalMutate(`/projects/id/${projectId}`));
  }
  if (projectSlug) keys.push(globalMutate(`/projects/slug/${projectSlug}`));
  keys.push(
    globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key === '/projects' || key.startsWith('/projects?')),
    ),
  );
  await Promise.all(keys);
}

export function useInvitationInbox(
  query: Partial<ProjectInvitationListQuery> = {},
  enabled = true,
) {
  const { data, error, isLoading } = useSWR<ProjectInvitationListResponse>(
    enabled ? inboxKey(query) : null,
    async (key: string) =>
      projectInvitationListResponseSchema.parse(await fetcher(key)),
  );
  return {
    invitations: data?.data ?? [],
    meta: data?.meta,
    error,
    isLoading,
  };
}

export function useInvitationPendingCount(enabled = true) {
  const { data, error, isLoading } =
    useSWR<ProjectInvitationPendingCountResponse>(
      enabled ? PENDING_COUNT_KEY : null,
      async (key: string) =>
        projectInvitationPendingCountResponseSchema.parse(await fetcher(key)),
      { refreshInterval: 60_000 },
    );
  return { pendingCount: data?.pendingCount ?? 0, error, isLoading };
}

export function useProjectInvitations(
  projectId?: string,
  query: Partial<ProjectInvitationListQuery> = {},
) {
  const { data, error, isLoading, mutate } =
    useSWR<ProjectInvitationListResponse>(
      projectId ? ownerInvitationsKey(projectId, query) : null,
      async (key: string) =>
        projectInvitationListResponseSchema.parse(await fetcher(key)),
    );
  return {
    invitations: data?.data ?? [],
    meta: data?.meta,
    error,
    isLoading,
    mutate,
  };
}

export function useProjectInvitationActions() {
  const searchCollaborator = useCallback(
    async (projectId: string, githubUsername: string) =>
      projectCollaboratorSearchResponseSchema.parse(
        await fetcher(
          `/projects/${projectId}/collaborators/search?githubUsername=${encodeURIComponent(
            githubUsername,
          )}`,
        ),
      ),
    [],
  );

  const createInvitation = useCallback(
    async (projectId: string, data: CreateProjectInvitationRequest) => {
      const invitation = projectInvitationResponseSchema.parse(
        await apiPost<unknown>(`/projects/${projectId}/invitations`, data),
      );
      await refreshInvitationData(projectId);
      return invitation;
    },
    [],
  );

  const acceptInvitation = useCallback(async (invitationId: string) => {
    const invitation = projectInvitationResponseSchema.parse(
      await apiPost<unknown>(`/project-invitations/${invitationId}/accept`),
    );
    await refreshInvitationData(invitation.project.id, invitation.project.slug);
    return invitation;
  }, []);

  const declineInvitation = useCallback(async (invitationId: string) => {
    const invitation = projectInvitationResponseSchema.parse(
      await apiPost<unknown>(`/project-invitations/${invitationId}/decline`),
    );
    await refreshInvitationData(invitation.project.id);
    return invitation;
  }, []);

  const cancelInvitation = useCallback(
    async (projectId: string, invitationId: string) => {
      const invitation = projectInvitationResponseSchema.parse(
        await apiDelete<unknown>(
          `/projects/${projectId}/invitations/${invitationId}`,
        ),
      );
      await refreshInvitationData(projectId);
      return invitation;
    },
    [],
  );

  return {
    searchCollaborator,
    createInvitation,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
  };
}

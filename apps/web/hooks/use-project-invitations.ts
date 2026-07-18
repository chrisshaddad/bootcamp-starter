'use client';

import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import type {
  CreateProjectInvitationRequest,
  ProjectInvitationListResponse,
  ProjectInvitationPendingCountResponse,
} from '@repo/contracts';
import {
  projectCollaboratorSearchResponseSchema,
  projectInvitationListResponseSchema,
  projectInvitationPendingCountResponseSchema,
  projectInvitationResponseSchema,
} from '@repo/contracts';
import { apiDelete, apiPost, fetcher } from '@/lib/api';

const INBOX_KEY = '/project-invitations?page=1&limit=50';
const PENDING_COUNT_KEY = '/project-invitations/pending-count';
const ownerInvitationsKey = (projectId: string) =>
  `/projects/${projectId}/invitations?page=1&limit=50`;

async function refreshInvitationData(projectId?: string, projectSlug?: string) {
  const keys: Array<Promise<unknown>> = [
    globalMutate(INBOX_KEY),
    globalMutate(PENDING_COUNT_KEY),
  ];
  if (projectId) {
    keys.push(globalMutate(ownerInvitationsKey(projectId)));
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

export function useInvitationInbox(enabled = true) {
  const { data, error, isLoading } = useSWR<ProjectInvitationListResponse>(
    enabled ? INBOX_KEY : null,
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

export function useProjectInvitations(projectId?: string) {
  const { data, error, isLoading } = useSWR<ProjectInvitationListResponse>(
    projectId ? ownerInvitationsKey(projectId) : null,
    async (key: string) =>
      projectInvitationListResponseSchema.parse(await fetcher(key)),
  );
  return {
    invitations: data?.data ?? [],
    error,
    isLoading,
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

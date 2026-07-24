'use client';

import useSWR, { useSWRConfig } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import type {
  GroupCreateRequest,
  GroupDetailResponse,
  GroupListResponse,
  GroupMembersAssignRequest,
  GroupUpdateRequest,
} from '@repo/contracts';

interface UseGroupsOptions {
  enabled?: boolean;
  organizationId?: string;
  limit?: number;
}

interface UseGroupsReturn {
  groups: GroupListResponse['groups'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  create: (
    body: GroupCreateRequest,
    organizationId?: string,
  ) => Promise<GroupDetailResponse>;
  mutate: () => void;
}

/**
 * Builds a groups API endpoint with an optional organization filter.
 */
function buildGroupsEndpoint(organizationId?: string, limit?: number): string {
  if (!organizationId && !limit) {
    return '/groups';
  }
  const params = new URLSearchParams();
  if (organizationId) params.set('organizationId', organizationId);
  if (limit) params.set('limit', String(limit));
  return `/groups?${params.toString()}`;
}

/**
 * Returns a callback that revalidates all cached group list and detail keys.
 */
function useInvalidateGroups() {
  const { mutate } = useSWRConfig();
  return useCallback(
    () =>
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/groups'),
        undefined,
        { revalidate: true },
      ),
    [mutate],
  );
}

/**
 * Fetches the groups list and exposes create + cache revalidation.
 */
export function useGroups(options: UseGroupsOptions = {}): UseGroupsReturn {
  const { enabled = true, organizationId, limit } = options;
  const endpoint = buildGroupsEndpoint(organizationId, limit);
  const invalidateGroups = useInvalidateGroups();

  const {
    data,
    error,
    isLoading,
    mutate: mutateList,
  } = useSWR<GroupListResponse>(enabled ? endpoint : null);

  /**
   * Creates a group and refreshes group-related caches.
   */
  const create = useCallback(
    async (body: GroupCreateRequest, organizationId?: string) => {
      const endpoint = buildGroupsEndpoint(organizationId);
      const result = await apiPost<GroupDetailResponse>(endpoint, body);
      await invalidateGroups();
      return result;
    },
    [invalidateGroups],
  );

  return {
    groups: data?.groups,
    total: data?.total,
    isLoading,
    error,
    create,
    mutate: mutateList,
  };
}

interface UseGroupOptions {
  enabled?: boolean;
}

interface UseGroupReturn {
  group: GroupDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  update: (body: GroupUpdateRequest) => Promise<GroupDetailResponse>;
  remove: () => Promise<void>;
  assignMembers: (
    body: GroupMembersAssignRequest,
  ) => Promise<GroupDetailResponse>;
  removeMember: (memberId: string) => Promise<GroupDetailResponse>;
  mutate: () => void;
}

/**
 * Fetches one group and exposes update, delete, and membership helpers.
 */
export function useGroup(
  id: string,
  options: UseGroupOptions = {},
): UseGroupReturn {
  const { enabled = true } = options;
  const endpoint = enabled && id ? `/groups/${id}` : null;
  const invalidateGroups = useInvalidateGroups();

  const {
    data,
    error,
    isLoading,
    mutate: mutateDetail,
  } = useSWR<GroupDetailResponse>(endpoint);

  /**
   * Updates the group and refreshes group-related caches.
   */
  const update = useCallback(
    async (body: GroupUpdateRequest) => {
      const result = await apiPatch<GroupDetailResponse>(`/groups/${id}`, body);
      await invalidateGroups();
      return result;
    },
    [id, invalidateGroups],
  );

  /**
   * Deletes the group and refreshes group-related caches.
   */
  const remove = useCallback(async () => {
    await apiDelete(`/groups/${id}`);
    await invalidateGroups();
  }, [id, invalidateGroups]);

  /**
   * Assigns Coordly members to the group and refreshes caches.
   */
  const assignMembers = useCallback(
    async (body: GroupMembersAssignRequest) => {
      const result = await apiPost<GroupDetailResponse>(
        `/groups/${id}/members`,
        body,
      );
      await invalidateGroups();
      return result;
    },
    [id, invalidateGroups],
  );

  /**
   * Removes one Coordly member from the group and refreshes caches.
   */
  const removeMember = useCallback(
    async (memberId: string) => {
      const result = await apiDelete<GroupDetailResponse>(
        `/groups/${id}/members/${memberId}`,
      );
      await invalidateGroups();
      return result;
    },
    [id, invalidateGroups],
  );

  return {
    group: data,
    isLoading,
    error,
    update,
    remove,
    assignMembers,
    removeMember,
    mutate: mutateDetail,
  };
}

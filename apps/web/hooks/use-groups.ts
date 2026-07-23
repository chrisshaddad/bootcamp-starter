'use client';

import useSWR, { mutate } from 'swr';
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
}

interface UseGroupsReturn {
  groups: GroupListResponse['groups'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  create: (body: GroupCreateRequest) => Promise<GroupDetailResponse>;
  mutate: () => void;
}

function buildGroupsEndpoint(organizationId?: string): string {
  if (!organizationId) {
    return '/groups';
  }
  const params = new URLSearchParams({ organizationId });
  return `/groups?${params.toString()}`;
}

function invalidateGroups() {
  return mutate(
    (key) => typeof key === 'string' && key.startsWith('/groups'),
    undefined,
    { revalidate: true },
  );
}

export function useGroups(options: UseGroupsOptions = {}): UseGroupsReturn {
  const { enabled = true, organizationId } = options;
  const endpoint = buildGroupsEndpoint(organizationId);

  const {
    data,
    error,
    isLoading,
    mutate: mutateList,
  } = useSWR<GroupListResponse>(enabled ? endpoint : null);

  const create = useCallback(async (body: GroupCreateRequest) => {
    const result = await apiPost<GroupDetailResponse>('/groups', body);
    await invalidateGroups();
    return result;
  }, []);

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

export function useGroup(
  id: string,
  options: UseGroupOptions = {},
): UseGroupReturn {
  const { enabled = true } = options;
  const endpoint = enabled && id ? `/groups/${id}` : null;

  const {
    data,
    error,
    isLoading,
    mutate: mutateDetail,
  } = useSWR<GroupDetailResponse>(endpoint);

  const update = useCallback(
    async (body: GroupUpdateRequest) => {
      const result = await apiPatch<GroupDetailResponse>(`/groups/${id}`, body);
      await invalidateGroups();
      return result;
    },
    [id],
  );

  const remove = useCallback(async () => {
    await apiDelete(`/groups/${id}`);
    await invalidateGroups();
  }, [id]);

  const assignMembers = useCallback(
    async (body: GroupMembersAssignRequest) => {
      const result = await apiPost<GroupDetailResponse>(
        `/groups/${id}/members`,
        body,
      );
      await invalidateGroups();
      return result;
    },
    [id],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const result = await apiDelete<GroupDetailResponse>(
        `/groups/${id}/members/${memberId}`,
      );
      await invalidateGroups();
      return result;
    },
    [id],
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

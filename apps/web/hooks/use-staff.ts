'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  StaffListResponse,
  StaffResponse,
  StaffInviteRequest,
  StaffRoleUpdateRequest,
} from '@repo/contracts';

const PREFIX = '/staff';

interface UseStaffOptions {
  search?: string;
  enabled?: boolean;
}

/**
 * List + mutations hook for library staff (ORG_ADMIN only, tenant-scoped by the
 * API). Invite creates a login pinned to the org and emails a magic link.
 */
export function useStaff(options: UseStaffOptions = {}) {
  const { search, enabled = true } = options;
  const { isOrgAdmin } = useCurrentOrg();

  const params = new URLSearchParams();
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  const query = params.toString();
  const endpoint = query ? `${PREFIX}?${query}` : PREFIX;

  const { data, error, isLoading, mutate } = useSWR<StaffListResponse>(
    isOrgAdmin && enabled ? endpoint : null,
  );

  const invite = useCallback(async (body: StaffInviteRequest) => {
    const res = await apiPost<StaffResponse>(PREFIX, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const changeRole = useCallback(
    async (id: string, body: StaffRoleUpdateRequest) => {
      const res = await apiPatch<StaffResponse>(`${PREFIX}/${id}/role`, body);
      await invalidateByPrefix(PREFIX);
      return res;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await apiDelete(`${PREFIX}/${id}`);
    await invalidateByPrefix(PREFIX);
  }, []);

  return {
    staff: data?.staff,
    total: data?.total,
    isLoading,
    error,
    mutate,
    invite,
    changeRole,
    remove,
  };
}

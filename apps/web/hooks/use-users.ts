'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import type { UserListResponse, UserSummary, UserRole } from '@repo/contracts';

const PREFIX = '/users';

interface UseUsersOptions {
  search?: string;
  role?: UserRole;
  isConfirmed?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Platform-wide user administration (SUPER_ADMIN). List + role change, org
 * unlink, and delete mutations.
 */
export function useUsers(options: UseUsersOptions = {}) {
  const {
    search,
    role,
    isConfirmed,
    page = 1,
    limit = 20,
    enabled = true,
  } = options;

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  if (role) params.set('role', role);
  if (isConfirmed !== undefined) params.set('isConfirmed', String(isConfirmed));
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<UserListResponse>(
    enabled ? endpoint : null,
  );

  const changeRole = useCallback(async (id: string, role: UserRole) => {
    const res = await apiPatch<UserSummary>(`${PREFIX}/${id}/role`, { role });
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const unlinkOrg = useCallback(async (id: string) => {
    const res = await apiPatch<UserSummary>(`${PREFIX}/${id}/unlink-org`);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(`${PREFIX}/${id}`);
    await invalidateByPrefix(PREFIX);
  }, []);

  return {
    users: data?.users,
    total: data?.total,
    isLoading,
    error,
    mutate,
    changeRole,
    unlinkOrg,
    remove,
  };
}

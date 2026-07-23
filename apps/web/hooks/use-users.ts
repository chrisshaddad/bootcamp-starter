'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  UserListResponse,
  UserAccountResponse,
  UserCreateRequest,
  UserUpdateRequest,
  UserRole,
} from '@repo/contracts';

function invalidateUserLists() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/users'),
    undefined,
    { revalidate: true },
  );
}

interface UseUsersOptions {
  organizationId?: string;
  role?: UserRole;
  enabled?: boolean;
}

interface UseUsersReturn {
  users: UserListResponse['users'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the list of users across organizations (Super Admin only)
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const { organizationId, role, enabled = true } = options;

  const params = new URLSearchParams();
  if (organizationId) params.set('organizationId', organizationId);
  if (role) params.set('role', role);
  params.set('limit', '100');
  const endpoint = `/users?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<UserListResponse>(enabled ? endpoint : null);

  return {
    users: data?.users,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseUserMutationsReturn {
  createUser: (data: UserCreateRequest) => Promise<UserAccountResponse>;
  updateUser: (
    id: string,
    data: UserUpdateRequest,
  ) => Promise<UserAccountResponse>;
  deactivateUser: (id: string) => Promise<UserAccountResponse>;
  reactivateUser: (id: string) => Promise<UserAccountResponse>;
}

/**
 * Hook for creating/updating/deactivating/reactivating users. Invalidates
 * all cached `/users` lists after each mutation.
 */
export function useUserMutations(): UseUserMutationsReturn {
  const createUser = useCallback(async (data: UserCreateRequest) => {
    const result = await apiPost<UserAccountResponse>('/users', data);
    invalidateUserLists();
    return result;
  }, []);

  const updateUser = useCallback(
    async (id: string, data: UserUpdateRequest) => {
      const result = await apiPatch<UserAccountResponse>(`/users/${id}`, data);
      invalidateUserLists();
      return result;
    },
    [],
  );

  const deactivateUser = useCallback(async (id: string) => {
    const result = await apiPatch<UserAccountResponse>(
      `/users/${id}/deactivate`,
    );
    invalidateUserLists();
    return result;
  }, []);

  const reactivateUser = useCallback(async (id: string) => {
    const result = await apiPatch<UserAccountResponse>(
      `/users/${id}/reactivate`,
    );
    invalidateUserLists();
    return result;
  }, []);

  return { createUser, updateUser, deactivateUser, reactivateUser };
}

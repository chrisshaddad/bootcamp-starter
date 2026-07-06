'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import type {
  UserCreateRequest,
  UserListResponse,
  UserResponse,
  UserRole,
  UserStatus,
  UserUpdateRequest,
} from '@repo/contracts';

interface UseUsersOptions {
  role?: UserRole;
  status?: UserStatus;
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
 * Hook for fetching the platform user list with optional role/status filters.
 * Mirrors the read pattern in `use-organizations.ts`.
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const { role, status, enabled = true } = options;

  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  const query = params.toString();
  const endpoint = query ? `/users?${query}` : '/users';

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

/**
 * Actions for mutating users from the super-admin console. Revalidates every
 * cached `/users` list (all filter combinations) after a successful update.
 */
export function useUserActions() {
  const revalidateLists = useCallback(() => {
    return globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/users'),
    );
  }, []);

  const createUser = useCallback(
    async (data: UserCreateRequest): Promise<UserResponse> => {
      const result = await apiPost<UserResponse>('/users', data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const updateUser = useCallback(
    async (id: string, data: UserUpdateRequest): Promise<UserResponse> => {
      const result = await apiPatch<UserResponse>(`/users/${id}`, data);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const deleteUser = useCallback(
    async (id: string): Promise<UserResponse> => {
      const result = await apiDelete<UserResponse>(`/users/${id}`);
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  return { createUser, updateUser, deleteUser };
}

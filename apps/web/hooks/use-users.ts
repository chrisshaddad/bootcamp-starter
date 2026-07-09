'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserActionResponse,
  UserListResponse,
} from '@repo/contracts';

interface UseUsersOptions {
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
 * Hook for fetching the list of users within the current admin's organization
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<UserListResponse>(enabled ? '/users' : null);

  return {
    users: data?.users,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

function invalidateUsers() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/users'),
    undefined,
    {
      revalidate: true,
    },
  );
}

/**
 * Hook for creating a user within the caller's organization.
 * Used by both Org Admin (full role picker) and Receptionist (Member only) forms.
 */
export function useCreateUser() {
  return useCallback(async (data: CreateUserRequest) => {
    const result = await apiPost<UserActionResponse>('/users', data);
    invalidateUsers();
    return result;
  }, []);
}

/**
 * Hook for updating a user's name/role within the caller's organization.
 */
export function useUpdateUser() {
  return useCallback(async (id: string, data: UpdateUserRequest) => {
    const result = await apiPatch<UserActionResponse>(`/users/${id}`, data);
    invalidateUsers();
    return result;
  }, []);
}

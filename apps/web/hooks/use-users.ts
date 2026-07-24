'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import {
  DEFAULT_PAGE_SIZE,
  type UserListResponse,
  type UserDetailResponse,
  type UserCreateRequest,
  type UserUpdateRequest,
  type UserStatusRequest,
  type StaffRole,
} from '@repo/contracts';

interface UseUsersOptions {
  role?: StaffRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

function buildUsersKey(options: UseUsersOptions): string {
  const params = new URLSearchParams();
  if (options.role) params.set('role', options.role);
  if (options.isActive !== undefined)
    params.set('isActive', String(options.isActive));
  if (options.search) params.set('search', options.search);
  if (options.page && options.page > 1)
    params.set('page', String(options.page));
  if (options.limit && options.limit !== DEFAULT_PAGE_SIZE)
    params.set('limit', String(options.limit));
  const qs = params.toString();
  return qs ? `/users?${qs}` : '/users';
}

function invalidateUsersList() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/users'),
    undefined,
    { revalidate: true },
  );
}

export function useUsers(options: UseUsersOptions = {}) {
  const { enabled = true } = options;
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<UserListResponse>(enabled ? buildUsersKey(options) : null);

  return {
    users: data?.users,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

export function useCreateUser() {
  const createUser = useCallback(async (data: UserCreateRequest) => {
    const result = await apiPost<UserDetailResponse>('/users', data);
    invalidateUsersList();
    return result;
  }, []);

  return { createUser };
}

export function useUpdateUser() {
  const updateUser = useCallback(
    async (id: string, data: UserUpdateRequest) => {
      const result = await apiPatch<UserDetailResponse>(`/users/${id}`, data);
      invalidateUsersList();
      return result;
    },
    [],
  );

  return { updateUser };
}

export function useSetUserStatus() {
  const setUserStatus = useCallback(async (id: string, isActive: boolean) => {
    const payload: UserStatusRequest = { isActive };
    const result = await apiPatch<UserDetailResponse>(
      `/users/${id}/status`,
      payload,
    );
    invalidateUsersList();
    return result;
  }, []);

  return { setUserStatus };
}

'use client';

import useSWR from 'swr';
import { useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiPost, apiPatch, ApiError } from '@/lib/api';
import type {
  LoginRequest,
  MagicLinkRequest,
  MagicLinkVerifyRequest,
  SignupRequest,
  UpdateProfileRequest,
  UserResponse,
} from '@repo/contracts';

interface UseUserOptions {
  redirectOnUnauthenticated?: boolean;
}

interface UseUserReturn {
  user: UserResponse | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: ApiError | undefined;
  mutate: () => void;
}

// Routes where we should NOT redirect on 401
const AUTH_ROUTES = ['/login', '/signup', '/auth'];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function useUser(options: UseUserOptions = {}): UseUserReturn {
  const { redirectOnUnauthenticated = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const { data, error, isLoading, mutate } = useSWR<UserResponse, ApiError>(
    '/auth/me',
  );

  // Redirect to login if session is invalid (401 Unauthorized)
  // Skip redirect if already on an auth route
  useEffect(() => {
    if (
      redirectOnUnauthenticated &&
      error?.status === 401 &&
      !isAuthRoute(pathname)
    ) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [error, redirectOnUnauthenticated, router, pathname]);

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data && !error,
    error,
    mutate,
  };
}

export function useAuth() {
  const { mutate } = useUser();

  const requestMagicLink = useCallback(async (data: MagicLinkRequest) => {
    return apiPost<{ success: boolean }>('/auth/magic-link', data);
  }, []);

  const verifyMagicLink = useCallback(
    async (data: MagicLinkVerifyRequest) => {
      const result = await apiPost<{ user: UserResponse }>(
        '/auth/magic-link/verify',
        data,
      );
      mutate();
      return result;
    },
    [mutate],
  );

  const login = useCallback(
    async (data: LoginRequest) => {
      const result = await apiPost<{ user: UserResponse }>('/auth/login', data);
      mutate();
      return result;
    },
    [mutate],
  );

  const signup = useCallback(
    async (data: SignupRequest) => {
      const result = await apiPost<{ user: UserResponse }>(
        '/auth/signup',
        data,
      );
      mutate();
      return result;
    },
    [mutate],
  );

  const logout = useCallback(async () => {
    await apiPost<{ success: boolean }>('/auth/logout');
    mutate();
  }, [mutate]);

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest) => {
      const result = await apiPatch<UserResponse>('/auth/profile', data);
      mutate();
      return result;
    },
    [mutate],
  );

  return {
    requestMagicLink,
    verifyMagicLink,
    login,
    signup,
    logout,
    updateProfile,
  };
}

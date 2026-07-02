'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiPost, ApiError } from '@/lib/api';
import type {
  MagicLinkRequest,
  MagicLinkVerifyRequest,
  PasswordLoginRequest,
  SetPasswordRequest,
  SignupRequest,
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
  mutate: KeyedMutator<UserResponse>;
}

// Where invited (PENDING) users are sent to finish onboarding.
const SET_PASSWORD_ROUTE = '/auth/set-password';

// Routes where we should NOT redirect on 401 (public auth pages)
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

  // Force invited (PENDING) users into the set-password flow. They hold a valid
  // session but cannot use the app until they onboard, so any protected page
  // sends them to set their password. Auth routes are skipped so the
  // set-password page itself (and other /auth pages) stay reachable.
  useEffect(() => {
    if (
      redirectOnUnauthenticated &&
      data?.status === 'PENDING' &&
      !isAuthRoute(pathname)
    ) {
      router.replace(SET_PASSWORD_ROUTE);
    }
  }, [data, redirectOnUnauthenticated, router, pathname]);

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data && !error,
    error,
    mutate,
  };
}

export function useAuth() {
  const router = useRouter();
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
    async (data: PasswordLoginRequest) => {
      const result = await apiPost<{ user: UserResponse }>('/auth/login', data);
      mutate();
      return result;
    },
    [mutate],
  );

  const signup = useCallback(async (data: SignupRequest) => {
    return apiPost<{ success: boolean }>('/auth/signup', data);
  }, []);

  const setPassword = useCallback(
    async (data: SetPasswordRequest) => {
      const result = await apiPost<{ user: UserResponse }>(
        '/auth/set-password',
        data,
      );
      mutate();
      return result;
    },
    [mutate],
  );

  const logout = useCallback(async () => {
    await apiPost<{ success: boolean }>('/auth/logout');
    // Clear the cached user without revalidating — /auth/me would 401 now and
    // could race a redirect that pins a stale ?redirect= param. Then send the
    // user to login explicitly so logout never depends on another component's
    // 401 effect firing.
    await mutate(undefined, { revalidate: false });
    router.replace('/login');
  }, [mutate, router]);

  return {
    requestMagicLink,
    verifyMagicLink,
    login,
    signup,
    setPassword,
    logout,
  };
}

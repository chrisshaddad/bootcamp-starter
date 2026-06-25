'use client';

import useSWR from 'swr';
import { useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiPost, ApiError } from '@/lib/api';
import { isAuthRoute } from '@/lib/auth-routes';
import type {
  MagicLinkRequest,
  MagicLinkVerifyRequest,
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

export function useUser(options: UseUserOptions = {}): UseUserReturn {
  const { redirectOnUnauthenticated = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const { data, error, isLoading, mutate } = useSWR<UserResponse, ApiError>(
    '/auth/me',
  );

  useEffect(() => {
    if (isAuthRoute(pathname)) return;

    // Session gone → redirect to login
    if (redirectOnUnauthenticated && error?.status === 401) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Gym suspended → redirect to suspended page
    if (data?.gymStatus === 'SUSPENDED') {
      router.replace('/suspended');
    // Member deactivated → redirect to deactivated page
    } else if (data?.memberStatus === 'INACTIVE') {
      router.replace('/portal/deactivated');
    }
  }, [data, error, redirectOnUnauthenticated, router, pathname]);

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

  const logout = useCallback(async () => {
    try {
      await apiPost<{ success: boolean }>('/auth/logout');
    } catch {
      // Logout is best-effort — always clear local session state regardless of server response
    }
    mutate();
  }, [mutate]);

  return {
    requestMagicLink,
    verifyMagicLink,
    logout,
  };
}

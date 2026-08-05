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
  AuthResponse,
  UpdateProfileRequest,
  UserResponse,
  ChangePasswordRequest,
  DeactivateAccountRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SuccessResponse,
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
const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/auth',
  '/forgot-password',
  '/reset-password',
];

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
      const result = await apiPost<AuthResponse>(
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
      const result = await apiPost<AuthResponse>('/auth/login', data);
      mutate();
      return result;
    },
    [mutate],
  );

  const signup = useCallback(
    async (data: SignupRequest) => {
      const result = await apiPost<AuthResponse>('/auth/signup', data);
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
      console.log('[DEBUG] 1. Submitting PATCH /auth/profile...');
      const result = await apiPatch<UserResponse>('/auth/profile', data);

      console.log(
        '[DEBUG] 2. Profile saved. Awaiting SWR re-fetch for /auth/me...',
      );
      // This forces the code to pause until the network tab shows "me" is finished
      await mutate();

      console.log(
        '[DEBUG] 3. SWR re-fetch finished. Cache is now 100% updated.',
      );
      return result;
    },
    [mutate],
  );

  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    return apiPatch<SuccessResponse>('/auth/password', data);
  }, []);

  const requestPasswordReset = useCallback(
    async (data: ForgotPasswordRequest) => {
      return apiPost<{ success: boolean }>('/auth/forgot-password', data);
    },
    [],
  );

  const resetPassword = useCallback(
    async (data: ResetPasswordRequest) => {
      const result = await apiPost<AuthResponse>('/auth/reset-password', data);
      mutate();
      return result;
    },
    [mutate],
  );

  const deactivateAccount = useCallback(
    async (data: DeactivateAccountRequest) => {
      const result = await apiPost<SuccessResponse>('/auth/deactivate', data);
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
    changePassword,
    requestPasswordReset,
    resetPassword,
    deactivateAccount,
  };
}

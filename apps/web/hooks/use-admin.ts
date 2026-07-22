'use client';

import { useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import {
  adminAccountListResponseSchema,
  adminAccountResponseSchema,
  adminAuditLogListResponseSchema,
  adminOverviewResponseSchema,
  adminProjectListResponseSchema,
  adminProjectResponseSchema,
  type AdminAccountListQuery,
  type AdminAccountStatusUpdate,
  type AdminAuditLogListQuery,
  type AdminProjectListQuery,
  type AdminProjectModeration,
} from '@repo/contracts';
import { apiPatch } from '@/lib/api';

function queryString(values: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'ALL') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function refreshAdminData() {
  return mutate(
    (key) => typeof key === 'string' && key.startsWith('/admin/'),
    undefined,
    { revalidate: true },
  );
}

export function useAdminOverview(enabled = true) {
  const result = useSWR(enabled ? '/admin/overview' : null);
  return {
    overview: result.data
      ? adminOverviewResponseSchema.parse(result.data)
      : undefined,
    isLoading: enabled && result.isLoading,
    error: result.error as Error | undefined,
    refresh: result.mutate,
  };
}

export function useAdminAccounts(
  query: Partial<AdminAccountListQuery>,
  enabled = true,
) {
  const endpoint = useMemo(
    () => `/admin/accounts${queryString(query)}`,
    [query],
  );
  const result = useSWR(enabled ? endpoint : null);
  const updateStatus = useCallback(
    async (userId: string, input: AdminAccountStatusUpdate) => {
      const response = await apiPatch(
        `/admin/accounts/${userId}/status`,
        input,
      );
      await refreshAdminData();
      return adminAccountResponseSchema.parse(response);
    },
    [],
  );

  return {
    response: result.data
      ? adminAccountListResponseSchema.parse(result.data)
      : undefined,
    isLoading: enabled && result.isLoading,
    error: result.error as Error | undefined,
    updateStatus,
  };
}

export function useAdminProjects(
  query: Partial<AdminProjectListQuery>,
  enabled = true,
) {
  const endpoint = useMemo(
    () => `/admin/projects${queryString(query)}`,
    [query],
  );
  const result = useSWR(enabled ? endpoint : null);
  const moderate = useCallback(
    async (projectId: string, input: AdminProjectModeration) => {
      const response = await apiPatch(
        `/admin/projects/${projectId}/moderation`,
        input,
      );
      await refreshAdminData();
      return adminProjectResponseSchema.parse(response);
    },
    [],
  );

  return {
    response: result.data
      ? adminProjectListResponseSchema.parse(result.data)
      : undefined,
    isLoading: enabled && result.isLoading,
    error: result.error as Error | undefined,
    moderate,
  };
}

export function useAdminAuditLogs(
  query: Partial<AdminAuditLogListQuery>,
  enabled = true,
) {
  const endpoint = useMemo(
    () => `/admin/audit-logs${queryString(query)}`,
    [query],
  );
  const result = useSWR(enabled ? endpoint : null);
  return {
    response: result.data
      ? adminAuditLogListResponseSchema.parse(result.data)
      : undefined,
    isLoading: enabled && result.isLoading,
    error: result.error as Error | undefined,
  };
}

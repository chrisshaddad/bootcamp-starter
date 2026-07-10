'use client';

import useSWR from 'swr';
import type { AuditListResponse } from '@repo/contracts';

interface UseAuditLogsOptions {
  action?: string;
  entity?: string;
  userId?: string;
  enabled?: boolean;
}

interface UseAuditLogsReturn {
  logs: AuditListResponse['logs'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Hook for fetching the platform audit log with optional action/entity/user
 * filters. Read-only; mirrors the read pattern in `use-users.ts`.
 */
export function useAuditLogs(
  options: UseAuditLogsOptions = {},
): UseAuditLogsReturn {
  const { action, entity, userId, enabled = true } = options;

  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (entity) params.set('entity', entity);
  if (userId) params.set('userId', userId);
  const query = params.toString();
  const endpoint = query ? `/audit?${query}` : '/audit';

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<AuditListResponse>(enabled ? endpoint : null);

  return {
    logs: data?.logs,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

'use client';

import useSWR from 'swr';
import type { AuditListResponse } from '@repo/contracts';
import { buildAuditQuery } from '@/lib/audit-query';

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

  const query = buildAuditQuery({ action, entity, userId });
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

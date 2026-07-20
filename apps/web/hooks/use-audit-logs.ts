'use client';

import useSWR from 'swr';
import type { AuditLogListResponse } from '@repo/contracts';

interface UseAuditLogsOptions {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  enabled?: boolean;
}

interface UseAuditLogsReturn {
  auditLogs: AuditLogListResponse['data'] | undefined;
  total: number | undefined;
  totalPages: number | undefined;
  page: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch paginated audit logs with optional filters */
export function useAuditLogs(options: UseAuditLogsOptions = {}): UseAuditLogsReturn {
  const { page = 1, limit = 20, entityType, action, enabled = true } = options;

  const params = new URLSearchParams({ 
    page: String(page),
    limit: String(limit)
  });
  
  if (entityType && entityType !== 'All') {
    params.set('entityType', entityType);
  }
  
  if (action) {
    params.set('action', action);
  }
  
  const endpoint = `/audit-logs?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<AuditLogListResponse>(enabled ? endpoint : null);

  return {
    auditLogs: data?.data,
    total: data?.total,
    totalPages: data?.totalPages,
    page: data?.page,
    isLoading,
    error,
    mutate,
  };
}

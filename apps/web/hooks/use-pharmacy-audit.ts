'use client';

import useSWR from 'swr';
import type { AuditListResponse } from '@repo/contracts';

interface UsePharmacyAuditLogsOptions {
  action?: string;
  entity?: string;
  userId?: string;
  enabled?: boolean;
}

/**
 * Pharmacy-scoped audit log for the pharmacy-admin console (`/audit/pharmacy`).
 * The API restricts entries to the caller's own pharmacy staff; the optional
 * filters just narrow the result. Read-only; mirrors `use-audit.ts`.
 */
export function usePharmacyAuditLogs(
  options: UsePharmacyAuditLogsOptions = {},
) {
  const { action, entity, userId, enabled = true } = options;

  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (entity) params.set('entity', entity);
  if (userId) params.set('userId', userId);
  const query = params.toString();
  const endpoint = query ? `/audit/pharmacy?${query}` : '/audit/pharmacy';

  const { data, error, isLoading, mutate } = useSWR<AuditListResponse>(
    enabled ? endpoint : null,
  );

  return {
    logs: data?.logs,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

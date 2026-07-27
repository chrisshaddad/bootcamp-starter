'use client';

import useSWR from 'swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import { ApiError } from '@/lib/api';
import type {
  DashboardSummaryResponse,
  PortalDashboardSummaryResponse,
  OrganizationSummaryResponse,
} from '@repo/contracts';

/**
 * Staff (ORG_ADMIN/LIBRARIAN) dashboard summary for their own library.
 */
export function useDashboardSummary() {
  const { isStaff } = useCurrentOrg();
  const { data, error, isLoading, mutate } = useSWR<
    DashboardSummaryResponse,
    ApiError
  >(isStaff ? '/dashboard/summary' : null);

  return { summary: data, isLoading, error, mutate };
}

/**
 * Patron (MEMBER) dashboard summary - aggregated across every library the
 * patron holds a membership at, not just the session's active one.
 */
export function usePortalDashboardSummary() {
  const { role } = useCurrentOrg();
  const { data, error, isLoading, mutate } = useSWR<
    PortalDashboardSummaryResponse,
    ApiError
  >(role === 'MEMBER' ? '/portal/dashboard/summary' : null);

  return { summary: data, isLoading, error, mutate };
}

/**
 * SUPER_ADMIN platform-wide dashboard summary.
 */
export function useOrganizationSummary() {
  const { role } = useCurrentOrg();
  const { data, error, isLoading, mutate } = useSWR<
    OrganizationSummaryResponse,
    ApiError
  >(role === 'SUPER_ADMIN' ? '/organizations/summary' : null);

  return { summary: data, isLoading, error, mutate };
}

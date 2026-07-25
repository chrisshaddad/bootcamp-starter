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
  const { data, error, isLoading } = useSWR<DashboardSummaryResponse, ApiError>(
    isStaff ? '/dashboard/summary' : null,
  );

  return { summary: data, isLoading, error };
}

/**
 * Patron (MEMBER) dashboard summary, scoped to their membership in the
 * active organization.
 */
export function usePortalDashboardSummary() {
  const { organizationId, role } = useCurrentOrg();
  const enabled = role === 'MEMBER' && !!organizationId;
  const { data, error, isLoading } = useSWR<
    PortalDashboardSummaryResponse,
    ApiError
  >(enabled ? '/portal/dashboard/summary' : null);

  return { summary: data, isLoading, error };
}

/**
 * SUPER_ADMIN platform-wide dashboard summary.
 */
export function useOrganizationSummary() {
  const { role } = useCurrentOrg();
  const { data, error, isLoading } = useSWR<
    OrganizationSummaryResponse,
    ApiError
  >(role === 'SUPER_ADMIN' ? '/organizations/summary' : null);

  return { summary: data, isLoading, error };
}

'use client';

import { useCallback } from 'react';
import { apiPatch, fetcher } from '@/lib/api';
import type {
  OrganizationDetailResponse,
  OrganizationUpdateRequest,
} from '@repo/contracts';

export function useOrganizationSettings(
  organizationId: string | null | undefined,
) {
  const getOrganization = useCallback(async () => {
    if (!organizationId) return null;
    return fetcher<OrganizationDetailResponse>(
      `/organizations/${organizationId}`,
    );
  }, [organizationId]);

  const updateOrganization = useCallback(
    async (
      data: OrganizationUpdateRequest,
    ): Promise<OrganizationDetailResponse> => {
      if (!organizationId) throw new Error('Organization ID not available');
      return apiPatch<OrganizationDetailResponse>(
        `/organizations/${organizationId}`,
        data,
      );
    },
    [organizationId],
  );

  return {
    getOrganization,
    updateOrganization,
  };
}

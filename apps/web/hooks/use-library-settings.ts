'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  OrganizationDetailResponse,
  OrganizationActionResponse,
  OrganizationUpdateRequest,
} from '@repo/contracts';

const ENDPOINT = '/organizations/current';

/**
 * The current library's own profile/branding (ORG_ADMIN self-service). Reads
 * `GET /organizations/current` and updates via `PATCH /organizations/current`.
 */
export function useLibrarySettings(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { isOrgAdmin } = useCurrentOrg();

  const { data, error, isLoading, mutate } = useSWR<OrganizationDetailResponse>(
    isOrgAdmin && enabled ? ENDPOINT : null,
  );

  const update = useCallback(
    async (body: OrganizationUpdateRequest) => {
      const res = await apiPatch<OrganizationActionResponse>(ENDPOINT, body);
      await mutate();
      await invalidateByPrefix('/organizations');
      return res;
    },
    [mutate],
  );

  return { organization: data, isLoading, error, mutate, update };
}

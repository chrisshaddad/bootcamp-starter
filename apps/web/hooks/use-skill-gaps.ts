'use client';

import useSWR from 'swr';
import type { SkillGapResponse } from '@repo/contracts';

interface UseSkillGapOptions {
  employeeId?: string;
  opportunityId?: string;
  enabled?: boolean;
}

interface UseSkillGapReturn {
  skillGap: SkillGapResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook for fetching skill gap analysis between an employee and an opportunity
 */
export function useSkillGap(
  options: UseSkillGapOptions = {},
): UseSkillGapReturn {
  const { employeeId, opportunityId, enabled = true } = options;

  const shouldFetch = enabled && !!employeeId && !!opportunityId;
  const endpoint = shouldFetch
    ? `/skill-gaps?employeeId=${employeeId}&opportunityId=${opportunityId}`
    : null;

  const { data, error, isLoading } = useSWR<SkillGapResponse>(endpoint);

  return {
    skillGap: data,
    isLoading,
    error,
  };
}

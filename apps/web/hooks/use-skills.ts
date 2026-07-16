'use client';

import useSWR from 'swr';
import type { SkillListResponse } from '@repo/contracts';

interface UseSkillsOptions {
  enabled?: boolean;
}

interface UseSkillsReturn {
  skills: SkillListResponse['skills'] | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook for fetching the org-wide skill lookup list
 */
export function useSkills(options: UseSkillsOptions = {}): UseSkillsReturn {
  const { enabled = true } = options;

  const { data, error, isLoading } = useSWR<SkillListResponse>(
    enabled ? '/skills?limit=100' : null,
  );

  return {
    skills: data?.skills,
    isLoading,
    error,
  };
}

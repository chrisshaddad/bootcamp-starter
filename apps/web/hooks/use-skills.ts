'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import type {
  SkillListResponse,
  SkillResponse,
  SkillCreateRequest,
  SkillUpdateRequest,
} from '@repo/contracts';

function invalidateSkills() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/skills'),
    undefined,
    { revalidate: true },
  );
}

interface UseSkillsOptions {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseSkillsReturn {
  skills: SkillListResponse['skills'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook for fetching org skills. Defaults to the full lookup list (limit 100)
 * for pickers; pass `page`/`limit`/`search`/`category` to drive the paginated,
 * searchable catalog view. `keepPreviousData` holds the current page while the
 * next loads so paging/filtering doesn't flash a skeleton.
 */
export function useSkills(options: UseSkillsOptions = {}): UseSkillsReturn {
  const { category, search, page, limit = 100, enabled = true } = options;

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  if (page) params.set('page', String(page));
  params.set('limit', String(limit));

  const { data, error, isLoading } = useSWR<SkillListResponse>(
    enabled ? `/skills?${params.toString()}` : null,
    { keepPreviousData: true },
  );

  return {
    skills: data?.skills,
    total: data?.total,
    isLoading,
    error,
  };
}

interface UseSkillMutationsReturn {
  createSkill: (data: SkillCreateRequest) => Promise<SkillResponse>;
  updateSkill: (id: string, data: SkillUpdateRequest) => Promise<SkillResponse>;
  deleteSkill: (id: string) => Promise<void>;
}

/**
 * Create/update/delete skills in the org catalog (HR/ORG_ADMIN only, enforced
 * server-side). Revalidates every cached `/skills` list after each mutation.
 */
export function useSkillMutations(): UseSkillMutationsReturn {
  const createSkill = useCallback(async (data: SkillCreateRequest) => {
    const result = await apiPost<SkillResponse>('/skills', data);
    invalidateSkills();
    return result;
  }, []);

  const updateSkill = useCallback(
    async (id: string, data: SkillUpdateRequest) => {
      const result = await apiPatch<SkillResponse>(`/skills/${id}`, data);
      invalidateSkills();
      return result;
    },
    [],
  );

  const deleteSkill = useCallback(async (id: string) => {
    await apiDelete(`/skills/${id}`);
    invalidateSkills();
  }, []);

  return { createSkill, updateSkill, deleteSkill };
}

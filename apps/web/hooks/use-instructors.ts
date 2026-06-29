'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  InstructorListResponse,
  InstructorResponse,
  InstructorCreateRequest,
  InstructorUpdateRequest,
  InstructorAvailabilityResponse,
} from '@repo/contracts';

export const INSTRUCTORS_PAGE_SIZE = 25;

interface UseInstructorsOptions {
  page?: number;
  isActive?: boolean;
  enabled?: boolean;
}

interface UseInstructorsReturn {
  instructors: InstructorListResponse['instructors'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch the paginated list of instructors for the gym */
export function useInstructors(
  options: UseInstructorsOptions = {},
): UseInstructorsReturn {
  const { page = 1, isActive, enabled = true } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(INSTRUCTORS_PAGE_SIZE),
  });
  if (isActive !== undefined) {
    params.set('isActive', String(isActive));
  }
  const endpoint = `/instructors?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<InstructorListResponse>(enabled ? endpoint : null);

  return {
    instructors: data?.instructors,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseInstructorReturn {
  instructor: InstructorResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  update: (dto: InstructorUpdateRequest) => Promise<InstructorResponse>;
  mutate: () => void;
}

/** Fetch a single instructor by ID and expose an update action */
export function useInstructor(
  id: string,
  options: { enabled?: boolean } = {},
): UseInstructorReturn {
  const { enabled = true } = options;
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<InstructorResponse>(enabled ? `/instructors/${id}` : null);

  /** Invalidate related queries */
  const invalidateAll = useCallback(() => {
    swrMutate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/instructors'),
      undefined,
      { revalidate: true },
    );
  }, [swrMutate]);

  /** Update the instructor */
  const update = useCallback(
    async (dto: InstructorUpdateRequest) => {
      const result = await apiPatch<InstructorResponse>(
        `/instructors/${id}`,
        dto,
      );
      invalidateAll();
      return result;
    },
    [id, invalidateAll],
  );

  return {
    instructor: data,
    isLoading,
    error,
    update,
    mutate: swrMutate,
  };
}

/** Create a new instructor and invalidate the instructors list */
export function useCreateInstructor() {
  const create = useCallback(async (dto: InstructorCreateRequest) => {
    const result = await apiPost<InstructorResponse>('/instructors', dto);
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/instructors'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { create };
}

/** Fetch instructors available for a given time slot (no overlapping non-cancelled sessions) */
export function useAvailableInstructors(
  startsAt: string | null,
  endsAt: string | null,
) {
  const enabled = Boolean(startsAt && endsAt);
  const endpoint = enabled
    ? `/instructors/available?startsAt=${encodeURIComponent(startsAt!)}&endsAt=${encodeURIComponent(endsAt!)}`
    : null;

  const { data, error, isLoading } =
    useSWR<InstructorAvailabilityResponse>(endpoint);

  return {
    availableInstructors: data?.instructors,
    isLoading,
    error,
  };
}

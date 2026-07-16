'use client';

import useSWR from 'swr';
import type { TechnologyResponse } from '@repo/contracts';

const TECHNOLOGIES_KEY = '/technologies';

// real: GET /technologies, public search/autocomplete endpoint.
export function useTechnologies() {
  const { data, error, isLoading } =
    useSWR<TechnologyResponse[]>(TECHNOLOGIES_KEY);
  return { technologies: data ?? [], error, isLoading };
}

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { type TechnologyResponse } from '@repo/contracts';

export function useTechnologies() {
  const { data, error, isLoading } = useSWR<TechnologyResponse[]>(
    '/technologies',
    fetcher,
  );

  return {
    technologies: data,
    isLoading,
    isError: error,
  };
}

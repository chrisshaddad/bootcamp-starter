'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost } from '@/lib/api';
import type {
  AiInsightListResponse,
  AiInsightGenerateRequest,
} from '@repo/contracts';

export function useAiInsights(options: { type?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (options.type) params.set('type', options.type);
  if (options.page) params.set('page', String(options.page));

  const endpoint = `/ai-insights${params.toString() ? `?${params}` : ''}`;

  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR<AiInsightListResponse>(endpoint);

  const invalidate = useCallback(() => {
    revalidate();
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/ai-insights'),
      undefined,
      { revalidate: true },
    );
  }, [revalidate]);

  const generateInsight = useCallback(
    async (
      req: AiInsightGenerateRequest,
    ): Promise<{ message: string; jobId: string }> => {
      const result = await apiPost<{ message: string; jobId: string }>(
        '/ai-insights/generate',
        req,
      );
      // Poll after a short delay
      setTimeout(invalidate, 5000);
      return result;
    },
    [invalidate],
  );

  return {
    insights: data?.insights,
    meta: data?.meta,
    isLoading,
    error,
    generateInsight,
    mutate: invalidate,
  };
}

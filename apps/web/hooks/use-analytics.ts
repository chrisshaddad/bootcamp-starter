'use client';

import useSWR from 'swr';
import {
  analyticsOverviewResponseSchema,
  analyticsProjectResponseSchema,
  analyticsTrackResponseSchema,
  type AnalyticsRange,
  type AnalyticsTrackRequest,
} from '@repo/contracts';
import { apiPost, fetcher } from '@/lib/api';

export function useAnalyticsOverview(range: AnalyticsRange) {
  const { data, error, isLoading } = useSWR(
    `/analytics/overview?range=${range}`,
    async (key: string) =>
      analyticsOverviewResponseSchema.parse(await fetcher(key)),
  );
  return { analytics: data, error, isLoading };
}

export function useProjectAnalytics(
  projectId: string | undefined,
  range: AnalyticsRange,
) {
  const { data, error, isLoading } = useSWR(
    projectId ? `/analytics/projects/${projectId}?range=${range}` : null,
    async (key: string) =>
      analyticsProjectResponseSchema.parse(await fetcher(key)),
  );
  return { analytics: data, error, isLoading };
}

export async function trackAnalyticsEvent(event: AnalyticsTrackRequest) {
  return analyticsTrackResponseSchema.parse(
    await apiPost<unknown>('/analytics/events', event),
  );
}

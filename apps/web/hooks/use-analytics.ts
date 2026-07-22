'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  analyticsOverviewResponseSchema,
  analyticsProjectResponseSchema,
  analyticsRangeSchema,
  analyticsTrackResponseSchema,
  type AnalyticsRange,
  type AnalyticsTrackRequest,
} from '@repo/contracts';
import { apiPost, fetcher } from '@/lib/api';

export function useAnalyticsRange() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedRange = analyticsRangeSchema.safeParse(searchParams.get('range'));
  const range: AnalyticsRange = parsedRange.success ? parsedRange.data : '30D';

  const setRange = (nextRange: AnalyticsRange) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set('range', nextRange);
    router.replace(`${pathname}?${nextSearchParams.toString()}`, {
      scroll: false,
    });
  };

  return { range, setRange };
}

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

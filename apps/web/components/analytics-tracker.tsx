'use client';

import { useEffect } from 'react';
import type { AnalyticsTrackRequest } from '@repo/contracts';
import { trackAnalyticsEvent } from '@/hooks/use-analytics';

export function AnalyticsTracker({ event }: { event: AnalyticsTrackRequest }) {
  const eventType = event.eventType;
  const target =
    event.eventType === 'PORTFOLIO_VIEW'
      ? event.developerSlug
      : event.projectSlug;

  useEffect(() => {
    const payload: AnalyticsTrackRequest =
      eventType === 'PORTFOLIO_VIEW'
        ? { eventType, developerSlug: target }
        : { eventType, projectSlug: target };
    void trackAnalyticsEvent(payload).catch(() => {
      // Analytics is non-critical and must never interrupt the page experience.
    });
  }, [eventType, target]);

  return null;
}

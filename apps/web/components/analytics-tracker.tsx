'use client';

import { useEffect, useRef } from 'react';
import type { AnalyticsTrackRequest } from '@repo/contracts';
import { trackAnalyticsEvent } from '@/hooks/use-analytics';

type AnalyticsTrackerEvent =
  | { eventType: 'PORTFOLIO_VIEW'; developerSlug: string }
  | { eventType: 'PROJECT_VIEW'; projectSlug: string };

export function AnalyticsTracker({ event }: { event: AnalyticsTrackerEvent }) {
  const eventType = event.eventType;
  const target =
    event.eventType === 'PORTFOLIO_VIEW'
      ? event.developerSlug
      : event.projectSlug;
  const eventIdRef = useRef<string | null>(null);

  useEffect(() => {
    const eventId = eventIdRef.current ?? crypto.randomUUID();
    eventIdRef.current = eventId;
    const payload: AnalyticsTrackRequest =
      eventType === 'PORTFOLIO_VIEW'
        ? { eventId, eventType, developerSlug: target }
        : { eventId, eventType, projectSlug: target };
    void trackAnalyticsEvent(payload).catch(() => {
      // Analytics is non-critical and must never interrupt the page experience.
    });
  }, [eventType, target]);

  return null;
}

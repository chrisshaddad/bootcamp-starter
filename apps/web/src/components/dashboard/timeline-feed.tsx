'use client';

import { CalendarIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useListTimelineQuery } from '@/store/api/endpoints/timeline.api';

function humanizeAction(action: string): string {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface TimelineFeedProps {
  locale: string;
  limit?: number;
}

export function TimelineFeed({ locale, limit = 10 }: TimelineFeedProps) {
  const { data, isLoading } = useListTimelineQuery({ limit });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Skeleton className="size-3 rounded-full mt-1" />
              {i < 2 && <Skeleton className="w-0.5 flex-1 my-1" />}
            </div>
            <div className="flex flex-col gap-1.5 pb-4 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const events = data?.data ?? [];

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <CalendarIcon className="size-8 opacity-40" />
        <p className="text-sm">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {events.map((event, index) => {
        const meta = event.metadata as Record<string, unknown>;
        const metaEmail = typeof meta?.email === 'string' ? meta.email : null;
        const metaRole = typeof meta?.role === 'string' ? meta.role : null;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className="mt-1 size-2.5 shrink-0 rounded-full bg-teal-500" />
              {index < events.length - 1 && (
                <span className="w-px flex-1 bg-border my-1" />
              )}
            </div>

            {/* Event content */}
            <div className="flex flex-col gap-1 pb-4 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium leading-snug">
                  {humanizeAction(event.action)}
                </span>
                {event.targetType && (
                  <Badge variant="secondary" className="text-xs">
                    {event.targetType}
                  </Badge>
                )}
              </div>

              {(metaEmail || metaRole) && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {metaEmail && <span>{metaEmail}</span>}
                  {metaRole && (
                    <span className="capitalize">
                      {String(metaRole).toLowerCase()}
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.createdAt), {
                  addSuffix: true,
                  locale: locale === 'ar' ? ar : undefined,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

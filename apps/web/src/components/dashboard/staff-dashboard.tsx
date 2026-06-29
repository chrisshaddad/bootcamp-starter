'use client';

import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Wrench } from 'lucide-react';
import { useListTimelineQuery } from '@/store/api/endpoints/timeline.api';
import type { MeResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StaffDashboardProps {
  me: MeResponse | null;
  locale: string;
  role: string;
}

function humanizeAction(action: string): string {
  const humanized = action.replace(/\./g, ' ');
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

export function StaffDashboard({ me, locale, role }: StaffDashboardProps) {
  const dateLocale = locale === 'ar' ? ar : undefined;

  const { data: timelineData, isLoading: timelineLoading } =
    useListTimelineQuery({ limit: 5 });

  const timelineEvents = timelineData?.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome, {me?.user?.fullName ?? 'there'}
          </CardTitle>
          <CardDescription>{me?.org?.name}</CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <Wrench className="h-10 w-10 text-amber-500/70" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">
                Property &amp; maintenance tools
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Manage properties, units, maintenance requests, and work orders
                — launching in stage 2.
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              Coming soon
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Recent Activity
        </h3>
        {timelineLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : timelineEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-2">
            {timelineEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0"
              >
                <p className="text-sm">{humanizeAction(event.action)}</p>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

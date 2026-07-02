'use client';

import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Home } from 'lucide-react';
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

interface TenantDashboardProps {
  me: MeResponse | null;
  locale: string;
}

export function TenantDashboard({ me, locale }: TenantDashboardProps) {
  const isAr = locale === 'ar';

  const { data: timelineData, isLoading: timelineLoading } =
    useListTimelineQuery({ limit: 5 });

  const events = timelineData?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {isAr
              ? `مرحباً ${me?.user?.fullName ?? ''}`
              : `Welcome home, ${me?.user?.fullName ?? 'there'}`}
          </CardTitle>
          <CardDescription>
            {isAr
              ? `عقارك: ${me?.org?.name ?? ''}`
              : `Your property: ${me?.org?.name ?? ''}`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Warm empty state card */}
      <Card className="border border-dashed border-muted-foreground/20 bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <Home className="h-10 w-10 text-primary/50" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">
              Your lease &amp; payments will appear here soon
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Once your landlord sets up your unit and lease, you&apos;ll see
              your balance, due dates, and payment history here.
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Stage 2
          </Badge>
        </CardContent>
      </Card>

      {/* Timeline section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {isAr ? 'نشاطك' : 'Your activity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {events.map((event) => (
                <li key={event.id} className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {(() => {
                      const h = event.action.replace(/\./g, ' ');
                      return h.charAt(0).toUpperCase() + h.slice(1);
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.createdAt), {
                      addSuffix: true,
                      locale: isAr ? ar : undefined,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

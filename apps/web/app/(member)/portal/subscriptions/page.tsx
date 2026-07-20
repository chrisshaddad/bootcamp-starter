'use client';

import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';
import { useMeSubscriptions } from '@/hooks/use-me';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubscriptionResponse } from '@repo/contracts';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border border-success/20',
  EXPIRED: 'bg-muted text-muted-foreground border border-border',
  CANCELLED: 'bg-error-light text-error border border-error/20',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

function SubscriptionRow({ sub }: { sub: SubscriptionResponse }) {
  const startDate = format(new Date(sub.startDate), 'MMM d, yyyy');
  const endDate = format(new Date(sub.endDate), 'MMM d, yyyy');
  const price = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(sub.price / 100);

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {sub.plan?.name ?? (
            <span className="text-muted-foreground italic">
              Plan removed
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {startDate} - {endDate}
          {sub.plan && (
            <span className="ml-2 text-muted-foreground/70">
              · {sub.plan.durationDays} days
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[sub.status] ?? 'bg-muted text-muted-foreground'}`}
        >
          {STATUS_LABELS[sub.status] ?? sub.status}
        </span>
        <span className="text-sm font-medium text-foreground">{price}</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function MySubscriptionsPage() {
  const { subscriptions, total, isLoading, error } = useMeSubscriptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          My Subscriptions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your full membership history.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            Subscription History
          </CardTitle>
          {total !== undefined && (
            <span className="text-sm text-muted-foreground">
              {total} total
            </span>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading && <LoadingSkeleton />}

          {!isLoading && error && (
            <div className="py-6 text-center text-sm text-error">
              Failed to load subscriptions. Please refresh.
            </div>
          )}

          {!isLoading &&
            !error &&
            (!subscriptions || subscriptions.length === 0) && (
              <div className="rounded-lg border border-border bg-muted py-8 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No subscriptions yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contact your gym to get started.
                </p>
              </div>
            )}

          {!isLoading &&
            !error &&
            subscriptions &&
            subscriptions.length > 0 && (
              <div>
                {subscriptions.map((sub) => (
                  <SubscriptionRow key={sub.id} sub={sub} />
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

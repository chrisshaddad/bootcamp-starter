'use client';

import { Clock } from 'lucide-react';
import { useMePlans } from '@/hooks/use-me';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanResponse } from '@repo/contracts';

function durationLabel(days: number): string {
  if (days % 365 === 0) {
    const y = days / 365;
    return `${y} year${y !== 1 ? 's' : ''}`;
  }
  if (days % 30 === 0) {
    const m = days / 30;
    return `${m} month${m !== 1 ? 's' : ''}`;
  }
  if (days % 7 === 0) {
    const w = days / 7;
    return `${w} week${w !== 1 ? 's' : ''}`;
  }
  return `${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * @param plan - membership plan from the portal API
 */
function PlanCard({ plan }: { plan: PlanResponse }) {
  const price = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: plan.price % 100 === 0 ? 0 : 2,
  }).format(plan.price / 100);

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary-base/50 hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-foreground leading-snug">
          {plan.name}
        </h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          <Clock className="h-3 w-3" />
          {durationLabel(plan.durationDays)}
        </span>
      </div>

      {/* Price */}
      <div className="mt-4">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {price}
        </span>
        <span className="ml-1.5 text-sm text-muted-foreground font-medium">
          one-time
        </span>
      </div>

      {/* Description */}
      {plan.description && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {plan.description}
        </p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-9 w-24" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function AvailablePlansPage() {
  const { plans, total, isLoading, error } = useMePlans();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Available Plans
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Membership plans currently offered by your gym.
          </p>
        </div>
        {!isLoading && total !== undefined && total > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {total} plan{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading && <LoadingSkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-error/20 bg-error/10 py-8 text-center">
          <p className="text-sm font-semibold text-error">
            Failed to load plans. Please refresh.
          </p>
        </div>
      )}

      {!isLoading && !error && (!plans || plans.length === 0) && (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Clock className="mx-auto h-9 w-9 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-bold text-foreground">
            No plans available yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back later for membership options.
          </p>
        </div>
      )}

      {!isLoading && !error && plans && plans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900 leading-snug">
          {plan.name}
        </h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          <Clock className="h-3 w-3" />
          {durationLabel(plan.durationDays)}
        </span>
      </div>

      {/* Price */}
      <div className="mt-4">
        <span className="text-3xl font-bold tracking-tight text-gray-900">
          {price}
        </span>
        <span className="ml-1.5 text-sm text-gray-500">one-time</span>
      </div>

      {/* Description */}
      {plan.description && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
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
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
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

/** Auto-generated docstring */
export default function AvailablePlansPage() {
  const { plans, total, isLoading, error } = useMePlans();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Plans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Membership plans currently offered by your gym.
          </p>
        </div>
        {!isLoading && total !== undefined && total > 0 && (
          <span className="text-sm text-gray-400">
            {total} plan{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading && <LoadingSkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-100 bg-red-50 py-8 text-center">
          <p className="text-sm text-red-600">
            Failed to load plans. Please refresh.
          </p>
        </div>
      )}

      {!isLoading && !error && (!plans || plans.length === 0) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-16 text-center">
          <Clock className="mx-auto h-9 w-9 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            No plans available yet
          </p>
          <p className="mt-1 text-sm text-gray-400">
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

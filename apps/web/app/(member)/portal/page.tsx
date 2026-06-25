'use client';

import Link from 'next/link';
import { ClipboardList, User } from 'lucide-react';
import { useMeProfile, useMeSubscriptions } from '@/hooks/use-me';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-primary-100 text-primary-base border border-primary-200',
  EXPIRED: 'bg-gray-200 text-gray-600 border border-gray-300',
  CANCELLED: 'bg-error-light text-error border border-error/20',
};

function ActiveSubscriptionCard() {
  const { subscriptions, isLoading, error } = useMeSubscriptions();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm font-medium text-error">
          Failed to load subscriptions
        </p>
        <p className="mt-1 text-sm text-gray-500">Please refresh the page.</p>
      </div>
    );
  }

  const active = subscriptions?.filter((s) => s.status === 'ACTIVE') ?? [];

  if (active.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm font-medium text-gray-700">
          No active subscription
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Contact your gym to get a membership plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {active.map((sub) => {
        const endDate = new Date(sub.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        return (
          <div key={sub.id} className="rounded-lg bg-primary-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary-base">
                  {sub.plan?.name ?? 'Membership Plan'}
                </p>
                <p className="mt-0.5 text-sm text-gray-600">
                  Active until{' '}
                  <span className="font-medium text-gray-800">{endDate}</span>
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS.ACTIVE}`}
              >
                Active
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PortalHomePage() {
  const { profile, isLoading } = useMeProfile();

  return (
    <div className="space-y-6">
      <div>
        {isLoading ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{profile?.name ? `, ${profile.name}` : ''}!
          </h1>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your membership.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 items-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ActiveSubscriptionCard />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-700">
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 text-gray-700"
            >
              <Link href="/portal/subscriptions">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                View all subscriptions
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 text-gray-700"
            >
              <Link href="/portal/plans">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                Browse available plans
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 text-gray-700"
            >
              <Link href="/portal/profile">
                <User className="h-4 w-4 text-gray-500" />
                My profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { format } from 'date-fns';
import { ClipboardList, Calendar } from 'lucide-react';
import {
  useMeProfile,
  useMeSubscriptions,
  useMeBookings,
} from '@/hooks/use-me';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-700">
          No active subscription
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Contact your gym desk to get a membership plan.
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
                <p className="mt-0.5 text-xs text-gray-600">
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

function UpcomingBookingsCard() {
  const { bookings, isLoading, error } = useMeBookings({
    status: 'BOOKED',
    page: 1,
  });

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
          Failed to load upcoming bookings
        </p>
        <p className="mt-1 text-sm text-gray-500">Please refresh the page.</p>
      </div>
    );
  }

  const upcoming = bookings ?? [];

  if (upcoming.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <Calendar className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-700">
          No upcoming bookings
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Contact your gym desk to register for scheduled sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {upcoming.slice(0, 3).map((booking) => {
        const session = booking.session;
        if (!session) return null;
        const startDate = format(new Date(session.startsAt), 'MMM d, yyyy');
        const startTime = format(new Date(session.startsAt), 'h:mm a');
        return (
          <div
            key={booking.id}
            className="rounded-lg border border-gray-100 bg-gray-50/50 p-3.5 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">
                {session.title}
              </p>
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {startTime}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {startDate}
              {session.instructor && (
                <span className="ml-1 text-gray-400">
                  · {session.instructor.name}
                </span>
              )}
            </p>
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
          Here&apos;s an overview of your membership and schedule.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 items-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-700">
              <ClipboardList className="h-4 w-4 text-gray-500" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ActiveSubscriptionCard />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-700">
              <Calendar className="h-4 w-4 text-gray-500" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <UpcomingBookingsCard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

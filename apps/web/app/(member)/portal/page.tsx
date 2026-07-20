'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ClipboardList, Calendar, ArrowRight } from 'lucide-react';
import {
  useMeProfile,
  useMeSubscriptions,
  useMeBookings,
} from '@/hooks/use-me';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border border-success/20',
  EXPIRED: 'bg-muted text-muted-foreground border border-border',
  CANCELLED: 'bg-error/10 text-error border border-error/20',
};

function CardLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

function CardErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-sm font-medium text-error">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Please refresh the page.
      </p>
    </div>
  );
}

function ActiveSubscriptionCard() {
  const { subscriptions, isLoading, error } = useMeSubscriptions();

  if (isLoading) {
    return <CardLoadingSkeleton />;
  }

  if (error) {
    return <CardErrorState message="Failed to load subscriptions" />;
  }

  const active = subscriptions?.filter((s) => s.status === 'ACTIVE') ?? [];

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-semibold text-foreground">
          No active subscription
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contact your gym desk to get a membership plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {active.map((sub) => {
          const endDate = new Date(sub.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          return (
            <div
              key={sub.id}
              className="rounded-xl border border-primary-base/20 bg-primary-base/5 dark:bg-primary-base/10 p-4 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {sub.plan?.name ?? 'Membership Plan'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Active until{' '}
                    <span className="font-semibold text-foreground">
                      {endDate}
                    </span>
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS.ACTIVE}`}
                >
                  Active
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        asChild
        variant="ghost"
        className="w-full justify-between text-xs font-semibold text-primary-base hover:bg-primary-base/10 hover:text-primary-base"
      >
        <Link href="/portal/subscriptions">
          <span>View all subscriptions</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function UpcomingBookingsCard() {
  const { bookings, isLoading, error } = useMeBookings({
    status: 'BOOKED',
    page: 1,
    limit: 3,
  });

  if (isLoading) {
    return <CardLoadingSkeleton />;
  }

  if (error) {
    return <CardErrorState message="Failed to load upcoming bookings" />;
  }

  const upcoming = bookings ?? [];

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-semibold text-foreground">
          No upcoming bookings
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contact your gym desk to register for scheduled sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {upcoming.slice(0, 3).map((booking) => {
          const session = booking.session;
          if (!session) return null;
          const startDate = format(new Date(session.startsAt), 'MMM d, yyyy');
          const startTime = format(new Date(session.startsAt), 'h:mm a');
          return (
            <div
              key={booking.id}
              className="rounded-xl border border-border bg-card/60 p-3.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-foreground">
                  {session.title}
                </p>
                <span className="shrink-0 rounded-full bg-primary-base/10 dark:bg-primary-base/20 px-2.5 py-0.5 text-xs font-semibold text-primary-base dark:text-primary-300">
                  {startTime}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {startDate}
                {session.instructor && (
                  <span className="ml-1 text-muted-foreground/80 font-medium">
                    · {session.instructor.name}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      <Button
        asChild
        variant="ghost"
        className="w-full justify-between text-xs font-semibold text-primary-base hover:bg-primary-base/10 hover:text-primary-base"
      >
        <Link href="/portal/bookings">
          <span>View all bookings</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export default function PortalHomePage() {
  const { profile, isLoading } = useMeProfile();

  return (
    <div className="space-y-6">
      <div>
        {isLoading ? (
          <Skeleton className="h-8 w-48 rounded-lg" />
        ) : (
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{profile?.name ? `, ${profile.name}` : ''}!
          </h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your membership and schedule.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 items-start">
        <Card className="glass-card card-elevated rounded-xl border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ActiveSubscriptionCard />
          </CardContent>
        </Card>

        <Card className="glass-card card-elevated rounded-xl border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <UpcomingBookingsCard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

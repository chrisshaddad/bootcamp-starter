'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { EventListResponse, UserResponse } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useEvents } from '@/hooks/use-events';
import { EventCalendar } from '@/components/event-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Clock, Users, Bell } from 'lucide-react';

interface PresenterDashboardProps {
  user: UserResponse;
  events?: EventListResponse['events'];
  eventsLoading: boolean;
}

function PresenterDashboard({
  user,
  events = [],
  eventsLoading,
}: PresenterDashboardProps) {
  // Get next upcoming event
  const upcomingEvent = events.reduce<
    EventListResponse['events'][number] | undefined
  >((next, event) => {
    if (!event.isUpcoming) return next;
    if (!next) return event;

    return new Date(event.startsAt).getTime() <
      new Date(next.startsAt).getTime()
      ? event
      : next;
  }, undefined);

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, Presenter {user?.name?.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your upcoming events.
        </p>
      </div>

      {/* Upcoming Event Panel */}
      {upcomingEvent ? (
        <Card className="border-primary-200 bg-gradient-to-br from-primary-50 to-white shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Next Upcoming Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {upcomingEvent.eventName}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5 text-primary-base" />
                  <span className="text-sm">
                    {formatDate(upcomingEvent.startsAt)} at{' '}
                    {formatTime(upcomingEvent.startsAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-5 w-5 text-primary-base" />
                  <span className="text-sm">
                    {upcomingEvent.attendeeCount} attendee
                    {upcomingEvent.attendeeCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No upcoming events scheduled
            </p>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout: Announcements + Calendar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Announcements (1/3 width) */}
        <div className="lg:col-span-1">
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Bell className="h-5 w-5" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-center text-sm text-gray-500">Coming soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Event Calendar (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <CalendarDays className="h-5 w-5" />
                Your Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EventCalendar events={events} isLoading={eventsLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const isPresenter =
    user?.role === 'MEMBER' && user?.memberRole === 'PRESENTER';
  const { events, isLoading: eventsLoading } = useEvents({
    enabled:
      !isLoading && (user?.role === 'ORG_ADMIN' || user?.role === 'MEMBER'),
  });

  useEffect(() => {
    if (!isLoading && user?.role === 'SUPER_ADMIN') {
      router.replace('/admin');
    }
  }, [isLoading, user?.role, router]);

  if (isLoading || user?.role === 'SUPER_ADMIN') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  // Presenter dashboard
  if (isPresenter) {
    return (
      <PresenterDashboard
        user={user}
        events={events}
        eventsLoading={eventsLoading}
      />
    );
  }

  // Default dashboard for other users
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome,{' '}
          {user?.profile?.firstName ||
            user?.name ||
            user?.email?.split('@')[0] ||
            'User'}
          !
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;re signed in. Start building your project.
        </p>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CalendarDays className="h-5 w-5" />
            Event Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventCalendar events={events} isLoading={eventsLoading} />
        </CardContent>
      </Card>

      {user && (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm capitalize text-gray-900">
                  {user.role.toLowerCase().replace('_', ' ')}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

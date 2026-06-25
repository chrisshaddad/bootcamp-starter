'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { useEvents } from '@/hooks/use-events';
import { EventCalendar } from '@/components/event-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
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

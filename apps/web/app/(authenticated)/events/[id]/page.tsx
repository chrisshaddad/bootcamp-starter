'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/use-auth';
import { useEvent } from '@/hooks/use-events';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, ShieldX, User, Users } from 'lucide-react';
import { ApiError } from '@/lib/api';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to access this page.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function truncateId(id: string) {
  return `${id.slice(0, 8)}…`;
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString();
}

function canAccessEvents(role: string | undefined) {
  return role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'MEMBER';
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, isLoading: userLoading } = useUser();
  const canAccess = canAccessEvents(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [isRegistering, setIsRegistering] = useState(false);

  const {
    event,
    isLoading: eventLoading,
    error,
    register,
  } = useEvent(id, {
    enabled: canAccess && !!id,
  });

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await register();
      toast.success('You are registered for this event');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to register for this event');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  if (eventLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2 text-gray-600"
          onClick={() => router.push('/events')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
        <div className="py-10 text-center text-error">
          Event not found or failed to load
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        className="gap-2 text-gray-600"
        onClick={() => router.push('/events')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {event.eventName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {event.isUpcoming ? 'Upcoming event' : 'Past event'}
          </p>
        </div>
        {event.canRegister && (
          <Button
            onClick={handleRegister}
            disabled={isRegistering}
            className="bg-primary-base hover:bg-primary-base/90"
          >
            {isRegistering ? 'Signing up...' : 'Sign up to attend'}
          </Button>
        )}
        {event.isRegistered && (
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-base">
            You are registered
          </span>
        )}
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Event ID</dt>
              <dd className="mt-1 font-mono text-sm text-gray-900">
                {event.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Starts</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(event.startsAt)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <User className="h-4 w-4" />
                Presenter
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {event.presenter?.username ??
                  (event.presenterId ? truncateId(event.presenterId) : '—')}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <Users className="h-4 w-4" />
                Attendees
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {event.attendeeCount} registered
              </dd>
            </div>
            {isSuperAdmin && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Organization ID
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-900">
                  {event.organizationId}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(event.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicEvent } from '@/hooks/use-public-events';

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function BrowseEventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { event, isLoading, error } = usePublicEvent(id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-100/40 via-white to-white">
      <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/browse" className="text-lg font-semibold text-gray-900">
            Coordly
          </Link>
          <Button asChild variant="outline">
            <Link href={`/login?redirect=/events/${id}`}>Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          All events
        </Link>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error || !event ? (
          <div className="mt-16 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Event not found
            </h1>
            <p className="mt-2 text-gray-500">
              This event may have passed, been cancelled, or no longer be
              available.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/browse">Browse events</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {event.eventName}
            </h1>
            <p className="mt-2 text-gray-600">
              Sign in to register and join this event.
            </p>

            <dl className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Starts</dt>
                  <dd className="mt-0.5 text-gray-900">
                    {formatDate(event.startsAt)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Organization
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {event.organizationName}
                  </dd>
                </div>
              </div>
              {event.presenter && (
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Presenter
                    </dt>
                    <dd className="mt-0.5 text-gray-900">
                      {event.presenter.username}
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-gray-500" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Registered
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {event.attendeeCount}{' '}
                    {event.attendeeCount === 1 ? 'person' : 'people'}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="bg-primary-base hover:bg-primary-base/90"
              >
                <Link href={`/login?redirect=/events/${event.id}`}>
                  Sign in to register
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/browse">Back to browse</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

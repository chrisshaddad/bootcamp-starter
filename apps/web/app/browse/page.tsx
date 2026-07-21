'use client';

import Link from 'next/link';
import { Calendar, MapPin, User } from 'lucide-react';
import { CoordlyLogo } from '@/components/coordly-logo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicEvents } from '@/hooks/use-public-events';

/**
 * Formats an event start date for the public event list.
 */
function formatDate(value: string | Date) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Renders the public Coordly event browse page.
 */
export default function BrowseEventsPage() {
  const { events, total, isLoading, error } = usePublicEvents();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-100/40 via-white to-white">
      <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/browse" aria-label="Go to Coordly events">
            <CoordlyLogo markClassName="size-7" />
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="max-w-2xl">
          <p className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-base">
            Coordly public event board
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
            Discover what your community is hosting next
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Browse upcoming Coordly events across participating organizations.
            Sign in when you&apos;re ready to register, attend, and stay in the
            loop.
          </p>
        </div>

        <section className="mt-10">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <p className="py-16 text-center text-error">
              Failed to load events. Please try again later.
            </p>
          ) : !events?.length ? (
            <p className="py-16 text-center text-gray-500">
              No upcoming events right now. Check back soon.
            </p>
          ) : (
            <>
              {total !== undefined && (
                <p className="mb-4 text-sm text-gray-500">
                  {total} upcoming {total === 1 ? 'event' : 'events'}
                </p>
              )}
              <ul className="space-y-4">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/browse/${event.id}`}
                      className="block rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-primary-base/40 hover:bg-primary-100/20"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {event.eventName}
                          </h2>
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 shrink-0" />
                            {formatDate(event.startsAt)}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 shrink-0" />
                            {event.organizationName}
                          </p>
                          {event.presenter && (
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                              <User className="h-4 w-4 shrink-0" />
                              {event.presenter.username}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-primary-base sm:pt-1">
                          View details
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

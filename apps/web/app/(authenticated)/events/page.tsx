'use client';

import { useUser } from '@/hooks/use-auth';
import { useEvents } from '@/hooks/use-events';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventCalendar } from '@/components/event-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
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

type EventFilter = 'all' | 'upcoming' | 'past';

export default function EventsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const canAccess = canAccessEvents(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';
  const isAttendeeUser = user?.role === 'MEMBER';
  const isPresenter =
    user?.role === 'MEMBER' && user?.memberRole === 'PRESENTER';
  const [eventFilter, setEventFilter] = useState<EventFilter | undefined>(
    undefined,
  );
  const activeFilter =
    eventFilter ?? (isPresenter ? 'all' : isAttendeeUser ? 'upcoming' : 'all');

  const upcomingFilter =
    activeFilter === 'upcoming'
      ? true
      : activeFilter === 'past'
        ? false
        : undefined;

  const {
    events,
    total,
    isLoading: eventsLoading,
    error,
  } = useEvents({
    enabled: canAccess,
    upcoming: upcomingFilter,
  });

  const { events: calendarEvents, isLoading: calendarLoading } = useEvents({
    enabled: canAccess,
  });

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isPresenter
              ? 'All organization events — yours are underlined in blue'
              : isAttendeeUser
                ? 'Browse upcoming events and sign up when eligible'
                : isSuperAdmin
                  ? 'Workshops, meetings, and camps across organizations'
                  : 'Workshops, meetings, and camps in your organization'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              className="bg-primary-base hover:bg-primary-base/90 gap-2"
              onClick={() => router.push('/events/new')}
            >
              <Plus className="h-4 w-4" />
              Create event
            </Button>
          )}
          <Select
            value={activeFilter}
            onValueChange={(value) => setEventFilter(value as EventFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventCalendar events={calendarEvents} isLoading={calendarLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Events
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load events
            </div>
          ) : !events?.length ? (
            <div className="py-10 text-center text-gray-500">
              No events found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Presenter</TableHead>
                  {isAttendeeUser && <TableHead>Your Status</TableHead>}
                  {isSuperAdmin && <TableHead>Organization ID</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`View event ${event.eventName}`}
                    onClick={() => router.push(`/events/${event.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/events/${event.id}`);
                      }
                    }}
                  >
                    <TableCell
                      className={cn(
                        'font-medium text-gray-900',
                        event.hostedByMe &&
                          'underline decoration-blue-600 decoration-2 underline-offset-2',
                      )}
                    >
                      {event.eventName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(event.startsAt)}
                    </TableCell>
                    <TableCell>
                      {event.status === 'CANCELLED' ? (
                        <span className="inline-flex rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error">
                          Cancelled
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-base">
                          Scheduled
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {event.presenter?.username ??
                        (event.presenterId
                          ? truncateId(event.presenterId)
                          : '—')}
                    </TableCell>
                    {isAttendeeUser && (
                      <TableCell>
                        {event.status === 'CANCELLED' ? (
                          <span className="inline-flex rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error">
                            Cancelled
                          </span>
                        ) : event.isRegistered ? (
                          <span className="inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-base">
                            Registered
                          </span>
                        ) : event.isUpcoming ? (
                          <span className="inline-flex rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Open
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            Closed
                          </span>
                        )}
                      </TableCell>
                    )}
                    {isSuperAdmin && (
                      <TableCell className="font-mono text-sm text-gray-500">
                        {truncateId(event.organizationId)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

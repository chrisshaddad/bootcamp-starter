'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  useStatsEvents,
  useStatsMembers,
  useStatsOverview,
  useStatsUsers,
} from '@/hooks/use-stats';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ShieldX,
  UserRound,
  Users,
} from 'lucide-react';
import { formatRate } from '@/lib/format';
import { cn } from '@/lib/utils';

type ReportTab = 'overview' | 'events' | 'attendees' | 'presenters';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'events', label: 'Events' },
  { id: 'attendees', label: 'Attendees' },
  { id: 'presenters', label: 'Presenters' },
];

const ALL_ORGS = 'all';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to access this page. Only Super Admins
        and Organization Admins can view reports.
      </p>
    </div>
  );
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function ReportErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <AlertTriangle className="h-8 w-8 text-error" />
      <p className="text-center text-sm text-gray-500">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOrgAdmin = user?.role === 'ORG_ADMIN';
  const canAccess = isSuperAdmin || isOrgAdmin;

  const [tab, setTab] = useState<ReportTab>('overview');
  const [orgFilter, setOrgFilter] = useState<string>(ALL_ORGS);
  const organizationId =
    isSuperAdmin && orgFilter !== ALL_ORGS ? orgFilter : undefined;

  const { organizations } = useOrganizations({ enabled: isSuperAdmin });

  const {
    overview,
    isLoading: overviewLoading,
    error: overviewError,
    mutate: mutateOverview,
  } = useStatsOverview({
    enabled: canAccess,
    organizationId,
  });
  const {
    events,
    isLoading: eventsLoading,
    error: eventsError,
    mutate: mutateEvents,
  } = useStatsEvents({
    enabled: canAccess && tab === 'events',
    organizationId,
  });
  const {
    users,
    isLoading: usersLoading,
    error: usersError,
    mutate: mutateUsers,
  } = useStatsUsers({
    enabled: canAccess && tab === 'attendees',
    organizationId,
  });
  const {
    members,
    isLoading: membersLoading,
    error: membersError,
    mutate: mutateMembers,
  } = useStatsMembers({
    enabled: canAccess && tab === 'presenters',
    organizationId,
  });

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="h-6 w-6" />
            Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSuperAdmin
              ? 'Attendance and activity statistics across organizations'
              : 'Attendance and activity statistics for your organization'}
          </p>
        </div>
        {isSuperAdmin && (
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ORGS}>All organizations</SelectItem>
              {organizations?.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === item.id
                ? 'border-primary-base text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-900',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {overviewError ? (
            <ReportErrorState
              message="Failed to load overview statistics. Please try again."
              onRetry={() => void mutateOverview()}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Coordly Members"
                  value={overviewLoading ? '—' : (overview?.memberCount ?? 0)}
                />
                <StatCard
                  title="Total Events"
                  value={overviewLoading ? '—' : (overview?.totalEvents ?? 0)}
                  subtitle={
                    overview
                      ? `${overview.upcomingEvents} upcoming · ${overview.pastEvents} past`
                      : undefined
                  }
                />
                <StatCard
                  title="Registrations"
                  value={
                    overviewLoading ? '—' : (overview?.totalRegistrations ?? 0)
                  }
                  subtitle={
                    overview
                      ? `${formatNumber(overview.avgRegistrationsPerPastEvent)} avg / past event`
                      : undefined
                  }
                />
                <StatCard
                  title="Attendance Rate"
                  value={
                    overviewLoading ? '—' : formatRate(overview?.attendanceRate)
                  }
                  subtitle={
                    overview
                      ? `${formatRate(overview.noShowRate)} no-show rate`
                      : undefined
                  }
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4" />
                      Top Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overviewLoading ? (
                      <TableSkeleton />
                    ) : !overview?.topEventsByRegistrations.length ? (
                      <p className="py-4 text-center text-sm text-gray-500">
                        No events yet
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {overview.topEventsByRegistrations.map((event) => (
                          <li
                            key={event.eventId}
                            className="flex items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/events/${event.eventId}`)
                              }
                              className="truncate text-left text-sm font-medium text-gray-900 hover:underline"
                            >
                              {event.eventName}
                            </button>
                            <span className="shrink-0 text-sm text-gray-500">
                              {event.registeredCount}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserRound className="h-4 w-4" />
                      Top Presenters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overviewLoading ? (
                      <TableSkeleton />
                    ) : !overview?.topPresentersByEvents.length ? (
                      <p className="py-4 text-center text-sm text-gray-500">
                        No presenters yet
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {overview.topPresentersByEvents.map((presenter) => (
                          <li
                            key={presenter.memberId}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-sm font-medium text-gray-900">
                              {presenter.username}
                            </span>
                            <span className="shrink-0 text-sm text-gray-500">
                              {presenter.eventsHosted} event
                              {presenter.eventsHosted !== 1 ? 's' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" />
                      Most Active Attendees
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overviewLoading ? (
                      <TableSkeleton />
                    ) : !overview?.topAttendees.length ? (
                      <p className="py-4 text-center text-sm text-gray-500">
                        No attendance yet
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {overview.topAttendees.map((attendee) => (
                          <li
                            key={attendee.userId}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-sm font-medium text-gray-900">
                              {attendee.name ?? attendee.email ?? '—'}
                            </span>
                            <span className="shrink-0 text-sm text-gray-500">
                              {attendee.attendedCount} attended
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'events' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <TableSkeleton />
            ) : eventsError ? (
              <ReportErrorState
                message="Failed to load event statistics. Please try again."
                onRetry={() => void mutateEvents()}
              />
            ) : !events?.length ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No events found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Starts</TableHead>
                    <TableHead>Presenter</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                    <TableHead className="text-right">Attended</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.eventId}
                      className="cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`View event ${event.eventName}`}
                      onClick={() => router.push(`/events/${event.eventId}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/events/${event.eventId}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {event.eventName}
                        {event.isUpcoming && (
                          <span className="ml-2 inline-flex rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-base">
                            Upcoming
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(event.startsAt)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {event.presenter?.username ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {event.registeredCount}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {event.attendedCount}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {event.skippedCount}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatRate(event.attendanceRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'attendees' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendee Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <TableSkeleton />
            ) : usersError ? (
              <ReportErrorState
                message="Failed to load attendee statistics. Please try again."
                onRetry={() => void mutateUsers()}
              />
            ) : !users?.length ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No attendees found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                    <TableHead className="text-right">Attended</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((attendee) => (
                    <TableRow key={attendee.userId}>
                      <TableCell className="font-medium text-gray-900">
                        {attendee.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {attendee.email}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {attendee.registeredCount}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {attendee.attendedCount}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {attendee.skippedCount}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatRate(attendee.attendanceRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'presenters' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presenter Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <TableSkeleton />
            ) : membersError ? (
              <ReportErrorState
                message="Failed to load presenter statistics. Please try again."
                onRetry={() => void mutateMembers()}
              />
            ) : !members?.length ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No members found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Hosted</TableHead>
                    <TableHead className="text-right">Upcoming</TableHead>
                    <TableHead className="text-right">Registrations</TableHead>
                    <TableHead className="text-right">Avg / Event</TableHead>
                    <TableHead className="text-right">Avg Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.memberId}>
                      <TableCell className="font-medium text-gray-900">
                        {member.username}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {member.role.charAt(0) +
                          member.role.slice(1).toLowerCase()}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {member.eventsHosted}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {member.upcomingHosted}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {member.totalRegistrationsAcrossEvents}
                      </TableCell>
                      <TableCell className="text-right text-gray-900">
                        {formatNumber(member.avgRegistrationsPerEvent)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatRate(member.avgAttendanceRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

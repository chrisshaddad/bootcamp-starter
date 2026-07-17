'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Announcement } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  Bell,
  Calendar,
  Eye,
  ExternalLink,
  Globe,
  LockKeyhole,
  Megaphone,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString();
}

function formatRelativeTime(value: string | Date, now: number) {
  const date = new Date(value).getTime();
  const seconds = Math.max(1, Math.floor((now - date) / 1000));
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

  if (seconds < 60) return formatter.format(-seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return formatter.format(-days, 'day');
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return formatter.format(-weeks, 'week');
  const months = Math.floor(days / 30);
  if (months < 12) return formatter.format(-months, 'month');
  return formatter.format(-Math.floor(days / 365), 'year');
}

function PublishedTime({ value, now }: { value: string | Date; now: number }) {
  const exactTime = formatDate(value);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={new Date(value).toISOString()}
          className="cursor-help underline decoration-gray-300 decoration-dotted underline-offset-2"
        >
          {formatRelativeTime(value, now)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{exactTime}</TooltipContent>
    </Tooltip>
  );
}

const scopeIcons: Record<Announcement['scope'], LucideIcon> = {
  SITE: Megaphone,
  ORG: Globe,
  EVENT: Calendar,
};

const scopeLabels: Record<Announcement['scope'], string> = {
  SITE: 'Site-wide',
  ORG: 'Org-wide',
  EVENT: 'Event-related',
};

const audienceIcons: Record<
  NonNullable<Announcement['audience']>,
  LucideIcon
> = {
  EVENT_ATTENDEES: LockKeyhole,
  WHOLE_ORG: Eye,
};

const audienceLabels: Record<NonNullable<Announcement['audience']>, string> = {
  EVENT_ATTENDEES: 'Event attendees',
  WHOLE_ORG: 'Whole organization',
};

function AnnouncementMetaIcons({
  announcement,
}: {
  announcement: Announcement;
}) {
  const ScopeIcon = scopeIcons[announcement.scope];
  const AudienceIcon = announcement.audience
    ? audienceIcons[announcement.audience]
    : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <ScopeIcon
        aria-label={scopeLabels[announcement.scope]}
        className="h-3.5 w-3.5"
      />
      {AudienceIcon && announcement.audience && (
        <AudienceIcon
          aria-label={audienceLabels[announcement.audience]}
          className="h-3.5 w-3.5"
        />
      )}
    </span>
  );
}

interface AnnouncementListProps {
  announcements?: Announcement[];
  isLoading: boolean;
  error?: Error;
  compact?: boolean;
  cardGrid?: boolean;
  showViewAll?: boolean;
  canManage?: (announcement: Announcement) => boolean;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
  deletingId?: string | null;
}

export function AnnouncementList({
  announcements,
  isLoading,
  error,
  compact = false,
  cardGrid = false,
  showViewAll = false,
  canManage,
  onEdit,
  onDelete,
  deletingId,
}: AnnouncementListProps) {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Bell className="h-5 w-5" />
        Announcements
      </h2>
      {showViewAll && (
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1">
          <Link href="/announcements">
            View all
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );

  const content = isLoading ? (
    compact && !cardGrid ? (
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    ) : cardGrid ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-lg" />
        ))}
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-lg" />
        ))}
      </div>
    )
  ) : error ? (
    <div className="py-8 text-center text-error">
      Failed to load announcements
    </div>
  ) : !announcements?.length ? (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-10">
      <Bell className="mb-3 h-10 w-10 text-gray-300" />
      <p className="text-center text-sm text-gray-500">No announcements yet</p>
    </div>
  ) : compact && !cardGrid ? (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <article
          key={announcement.id}
          className="rounded-lg border border-gray-200 p-3 sm:p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-sm font-semibold text-gray-900 sm:text-base">
                {announcement.title}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 break-words text-xs text-gray-500">
                <AnnouncementMetaIcons announcement={announcement} />
                {announcement.eventName && announcement.eventId && (
                  <>
                    <span>•</span>
                    <Link
                      href={`/events/${announcement.eventId}`}
                      className="rounded px-1 font-medium text-primary-base transition-colors hover:bg-primary-100 hover:no-underline"
                    >
                      {announcement.eventName}
                    </Link>
                  </>
                )}
                {announcement.eventName && !announcement.eventId && (
                  <>
                    <span>•</span>
                    <span>{announcement.eventName}</span>
                  </>
                )}
                <span>•</span>
                <span>
                  {announcement.authorId === user?.id
                    ? 'You'
                    : announcement.authorName}
                </span>
                <span>•</span>
                <PublishedTime value={announcement.createdAt} now={now} />
              </p>
            </div>
            {canManage?.(announcement) && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Announcement actions"
                    disabled={deletingId === announcement.id}
                    className="shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onSelect={() => onEdit(announcement)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDelete(announcement)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === announcement.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div
            className={cn(
              'mt-3 max-w-none text-sm text-gray-700',
              '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:ml-5 [&_ul]:list-disc',
              '[&_ol]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold',
              'line-clamp-4',
            )}
            dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
          />
        </article>
      ))}
    </div>
  ) : (
    <div
      className={
        cardGrid
          ? 'grid items-start gap-3 sm:grid-cols-2'
          : 'grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3'
      }
    >
      {announcements.map((announcement) => (
        <article
          key={announcement.id}
          className={cn(
            'flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
            cardGrid ? 'min-h-44' : 'min-h-52',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
                  <AnnouncementMetaIcons announcement={announcement} />
                  {scopeLabels[announcement.scope]}
                </span>
                {announcement.audience && (
                  <span className="rounded-full bg-primary-100 px-2 py-1 font-medium text-primary-base">
                    {audienceLabels[announcement.audience]}
                  </span>
                )}
              </div>
              <h3 className="break-words text-base font-semibold leading-snug text-gray-900">
                {announcement.title}
              </h3>
            </div>
            {canManage?.(announcement) && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Announcement actions"
                    disabled={deletingId === announcement.id}
                    className="shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onSelect={() => onEdit(announcement)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDelete(announcement)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === announcement.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div
            className={cn(
              'mt-3 max-w-none flex-1 text-sm leading-6 text-gray-700',
              '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:ml-5 [&_ul]:list-disc',
              '[&_ol]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold',
              cardGrid ? 'line-clamp-3' : 'line-clamp-5',
            )}
            dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
          />

          <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
            {announcement.eventName && (
              <div className="flex min-w-0 items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {announcement.eventId ? (
                  <Link
                    href={`/events/${announcement.eventId}`}
                    className="truncate rounded px-1 font-medium text-primary-base transition-colors hover:bg-primary-100 hover:no-underline"
                  >
                    {announcement.eventName}
                  </Link>
                ) : (
                  <span className="truncate">{announcement.eventName}</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {announcement.authorId === user?.id
                  ? 'You'
                  : announcement.authorName}
              </span>
              <span>•</span>
              <PublishedTime value={announcement.createdAt} now={now} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );

  if (compact && !cardGrid) {
    return (
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>{header}</CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      {header}
      {content}
    </section>
  );
}

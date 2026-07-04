'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Announcement } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function PublishedTime({ value }: { value: string | Date }) {
  const [now, setNow] = useState(() => Date.now());
  const exactTime = formatDate(value);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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
  showViewAll = false,
  canManage,
  onEdit,
  onDelete,
  deletingId,
}: AnnouncementListProps) {
  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Bell className="h-5 w-5" />
          Announcements
        </CardTitle>
        {showViewAll && (
          <Button asChild variant="ghost" size="sm" className="w-fit gap-1">
            <Link href="/announcements">
              View all
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(compact ? 3 : 5)].map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-error">
            Failed to load announcements
          </div>
        ) : !announcements?.length ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Bell className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-center text-sm text-gray-500">
              No announcements yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="rounded-lg border border-gray-200 p-3 sm:p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-gray-900 sm:text-base">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 break-words text-xs text-gray-500">
                      <AnnouncementMetaIcons announcement={announcement} />
                      {announcement.eventName && announcement.eventId && (
                        <span>
                          •{' '}
                          <Link
                            href={`/events/${announcement.eventId}`}
                            className="font-medium text-primary-base hover:underline"
                          >
                            {announcement.eventName}
                          </Link>
                        </span>
                      )}
                      {announcement.eventName && !announcement.eventId && (
                        <span>• {announcement.eventName}</span>
                      )}
                      <span>• {announcement.authorName}</span>
                      <span>
                        • <PublishedTime value={announcement.createdAt} />
                      </span>
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
                          className="self-start"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem
                            onSelect={() => onEdit(announcement)}
                          >
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
                    compact && 'line-clamp-4',
                  )}
                  dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
                />
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

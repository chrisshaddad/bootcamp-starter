'use client';

import Link from 'next/link';
import type { Announcement } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Bell, ExternalLink } from 'lucide-react';

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString();
}

function scopeLabel(announcement: Announcement) {
  if (announcement.scope === 'SITE') {
    return 'Site-wide';
  }

  if (announcement.scope === 'ORG') {
    return 'Org-wide';
  }

  return announcement.audience === 'EVENT_ATTENDEES'
    ? 'Event attendees'
    : 'Event';
}

interface AnnouncementListProps {
  announcements?: Announcement[];
  isLoading: boolean;
  error?: Error;
  compact?: boolean;
  showViewAll?: boolean;
}

export function AnnouncementList({
  announcements,
  isLoading,
  error,
  compact = false,
  showViewAll = false,
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
                    <p className="mt-1 break-words text-xs text-gray-500">
                      {scopeLabel(announcement)}
                      {announcement.eventName
                        ? ` • ${announcement.eventName}`
                        : ''}{' '}
                      • {announcement.authorName} •{' '}
                      {formatDate(announcement.createdAt)}
                    </p>
                  </div>
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

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/store/api/endpoints/notifications.api';
import type { NotificationResponse } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

type Props = {
  locale: string;
  dict: Dictionary;
};

// Relative time ("3 minutes ago") with a graceful fallback to an absolute date.
// Mirrors the header bell so the two surfaces read consistently.
function useRelativeTime(locale: string) {
  return useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const abs = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (iso: string) => {
      const then = new Date(iso).getTime();
      if (Number.isNaN(then)) return '';
      const diffSec = Math.round((then - Date.now()) / 1000);
      const absSec = Math.abs(diffSec);
      if (absSec < 60) return rtf.format(Math.round(diffSec), 'second');
      if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
      if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
      if (absSec < 604800) return rtf.format(Math.round(diffSec / 86400), 'day');
      return abs.format(new Date(iso));
    };
  }, [locale]);
}

// Maps a notification to the page it originated from, when derivable. Kept
// deliberately conservative — only ticket-related notifications currently
// have a known destination; everything else falls back to mark-read-only.
function getNotificationTarget(
  notification: NotificationResponse,
  locale: string,
): string | null {
  const data = notification.data;
  const hasTicketId =
    !!data &&
    typeof data === 'object' &&
    'ticketId' in data &&
    typeof (data as Record<string, unknown>).ticketId === 'string';
  const type = notification.type.toLowerCase();
  if (type.includes('support') || type.includes('ticket') || hasTicketId) {
    return `/${locale}/dashboard/support`;
  }
  return null;
}

export function NotificationsPage({ locale, dict }: Props) {
  const t = dict.notifications;
  const router = useRouter();

  const { data: list, isLoading, isError } = useListNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const formatRelative = useRelativeTime(locale);

  const notifications = list?.data ?? [];
  const unreadCount = list?.unreadCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.title}
            {unreadCount > 0 && (
              <span className="ms-2 align-middle text-sm font-normal text-muted-foreground">
                {unreadCount} {t.unread}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t.pageSubtitle}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={markingAll}
            onClick={() => markAllRead()}
          >
            <CheckCheck className="size-4" />
            {t.markAllRead}
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {t.loadError}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 size-8 opacity-30" />
          {t.empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => {
            const target = getNotificationTarget(n, locale);
            return (
              <NotificationCard
                key={n.id}
                notification={n}
                timeLabel={formatRelative(n.createdAt)}
                onActivate={() => {
                  markRead(n.id);
                  if (target) router.push(target);
                }}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  timeLabel,
  onActivate,
}: {
  notification: NotificationResponse;
  timeLabel: string;
  onActivate: () => void;
}) {
  const isUnread = !notification.readAt;

  const inner = (
    <div className="flex items-start gap-3">
      {isUnread && (
        <span
          aria-hidden="true"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-500"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{timeLabel}</p>
      </div>
    </div>
  );

  if (isUnread) {
    return (
      <li>
        <button
          type="button"
          onClick={onActivate}
          className="flex w-full flex-col rounded-xl border border-s-2 border-s-teal-500 bg-teal-500/5 p-4 text-start transition-colors hover:bg-teal-500/10 focus-visible:bg-teal-500/10 focus-visible:outline-none"
        >
          {inner}
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-xl border bg-card p-4">{inner}</li>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  useListNotificationsQuery,
  useGetUnreadCountQuery,
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
function useRelativeTime(locale: string) {
  return useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const abs = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
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

export function NotificationsBell({ locale, dict }: Props) {
  const t = dict.notifications;
  const [open, setOpen] = useState(false);
  const isRtl = locale === 'ar';

  // Lightweight polled badge; the full list is only fetched while the panel is open.
  const { data: unread } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000,
  });
  const {
    data: list,
    isLoading,
    isError,
  } = useListNotificationsQuery(undefined, { skip: !open });

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const formatRelative = useRelativeTime(locale);

  const unreadCount = unread?.unreadCount ?? 0;
  const notifications = list?.data ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative" />
        }
        aria-label={t.a11yOpen}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side={isRtl ? 'left' : 'right'}
        className="w-full gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b pe-12">
          <SheetTitle>
            {t.title}
            {unreadCount > 0 && (
              <span className="ms-2 text-xs font-normal text-muted-foreground">
                {unreadCount} {t.unread}
              </span>
            )}
          </SheetTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={markingAll}
              onClick={() => markAllRead()}
            >
              <CheckCheck className="size-3.5" />
              {t.markAllRead}
            </Button>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <ul className="divide-y">
              {[...Array(4)].map((_, i) => (
                <li key={i} className="flex flex-col gap-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : isError ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t.loadError}
            </p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <Bell className="size-8 opacity-30" />
              {t.empty}
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  timeLabel={formatRelative(n.createdAt)}
                  onMarkRead={() => markRead(n.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer: jump to the full-history inbox page. */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            render={
              <Link href={`/${locale}/dashboard/notifications`} />
            }
            onClick={() => setOpen(false)}
          >
            {t.viewAll}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NotificationRow({
  notification,
  timeLabel,
  onMarkRead,
}: {
  notification: NotificationResponse;
  timeLabel: string;
  onMarkRead: () => void;
}) {
  const isUnread = !notification.readAt;

  const body = (
    <>
      <div className="flex items-start gap-2">
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
    </>
  );

  if (isUnread) {
    return (
      <li>
        <button
          type="button"
          onClick={onMarkRead}
          className="flex w-full flex-col border-s-2 border-teal-500 bg-teal-500/5 p-4 text-start transition-colors hover:bg-teal-500/10 focus-visible:bg-teal-500/10 focus-visible:outline-none"
        >
          {body}
        </button>
      </li>
    );
  }

  return (
    <li className="border-s-2 border-transparent p-4">{body}</li>
  );
}

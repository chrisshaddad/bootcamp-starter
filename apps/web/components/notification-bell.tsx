'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import type { AuditLogItem } from '@repo/contracts';
import {
  useNotifications,
  NOTIFICATION_DISPLAY_LIMIT,
} from '@/hooks/use-notifications';
import {
  actionMeta,
  notificationHref,
  type Category,
} from '@/lib/audit-format';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Category → dot color, so a reader can spot destructive events at a glance
// without reading every line (mirrors the audit console's color axis).
const CATEGORY_DOT: Record<Category, string> = {
  create: 'bg-success',
  update: 'bg-warning',
  delete: 'bg-error',
  login: 'bg-primary-base',
  security: 'bg-primary-hover',
};

function timeAgo(value: AuditLogItem['createdAt']): string {
  const then = new Date(value).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function actorName(item: AuditLogItem): string {
  return item.userName ?? item.userEmail ?? 'System';
}

export function NotificationBell() {
  const { notifications, unreadCount, isRead, markRead, markAllRead, enabled } =
    useNotifications();
  const [open, setOpen] = useState(false);

  // Only the super admin has access to the platform audit feed.
  if (!enabled) return null;

  const items = (notifications ?? []).slice(0, NOTIFICATION_DISPLAY_LIMIT);
  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
          className="relative h-10 w-10 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <Bell className="h-5 w-5" />
          {hasUnread ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="thin-scroll w-80 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Notifications</p>
          {hasUnread ? (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-xs font-medium text-primary-hover hover:underline"
            >
              Mark all as read
            </button>
          ) : null}
        </div>

        <div className="thin-scroll max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No activity yet</p>
            </div>
          ) : (
            items.map((item) => {
              const meta = actionMeta(item.action);
              const unread = !isRead(item.id);
              return (
                <div
                  key={item.id}
                  className={`group flex items-start gap-2 border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50 ${
                    unread ? 'bg-primary-100/40' : ''
                  }`}
                >
                  <Link
                    href={notificationHref(item)}
                    onClick={() => {
                      markRead(item.id);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 gap-3 py-3 pl-4"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        unread ? CATEGORY_DOT[meta.category] : 'bg-gray-300'
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          unread
                            ? 'font-semibold text-gray-900'
                            : 'font-medium text-gray-600'
                        }`}
                      >
                        {meta.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {actorName(item)} · {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </Link>
                  {unread ? (
                    <button
                      type="button"
                      title="Mark as read"
                      aria-label="Mark as read"
                      onClick={() => markRead(item.id)}
                      className="mt-2.5 mr-3 shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-gray-700 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <Link
          href="/admin/audit"
          onClick={() => setOpen(false)}
          className="block border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-primary-hover hover:bg-gray-50"
        >
          View all activity
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, MessageSquare } from 'lucide-react';
import type { InquiryStatus } from '@repo/contracts';
import {
  useInquiryNotifications,
  type InquiryNotification,
} from '@/hooks/use-inquiry-notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Status → dot colour, so the officer can gauge each awaiting inquiry at a
// glance (mirrors the queue's status styling).
const STATUS_DOT: Record<InquiryStatus, string> = {
  PENDING: 'bg-warning',
  IN_PROGRESS: 'bg-primary-base',
  ANSWERED: 'bg-success',
  CLOSED: 'bg-gray-300',
};

function timeAgo(value: InquiryNotification['lastMessageAt']): string {
  if (!value) return '';
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

/**
 * Notification bell for the inquiry officer: surfaces inquiries awaiting a reply
 * (last message from the client) with an unread badge. Officer-only; self-hides
 * for every other role.
 */
export function InquiryNotificationBell() {
  const {
    notifications,
    unreadCount,
    isRead,
    markRead,
    markAllRead,
    isLoading,
    error,
    enabled,
  } = useInquiryNotifications();
  const [open, setOpen] = useState(false);

  // `enabled` is derived from client-side auth, so gate on a mounted flag: both
  // the server and the first client render output nothing, keeping this Radix
  // dropdown out of the hydration tree (otherwise it shifts the useId counter
  // and triggers a hydration mismatch). Reveal after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !enabled) return null;

  const items = notifications ?? [];
  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            hasUnread
              ? `Inquiry notifications, ${unreadCount} awaiting reply`
              : 'Inquiry notifications'
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
          <p className="text-sm font-semibold text-gray-900">
            Awaiting your reply
          </p>
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
          {isLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 animate-pulse text-gray-300" />
              <p className="text-sm text-gray-500">Loading inquiries…</p>
            </div>
          ) : error && items.length === 0 ? (
            // Initial fetch failed with nothing cached — say so rather than
            // showing a misleading "all caught up".
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-error" />
              <p className="text-sm text-gray-500">
                Couldn&apos;t load inquiries.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                You&apos;re all caught up — nothing awaiting a reply.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const unread = !isRead(item.notifId);
              return (
                <DropdownMenuItem
                  key={item.notifId}
                  asChild
                  className={`flex items-start gap-3 rounded-none border-b border-gray-50 px-4 py-3 last:border-0 focus:bg-gray-50 ${
                    unread ? 'bg-primary-100/40' : ''
                  }`}
                >
                  <Link
                    href={`/inquiries/${item.inquiryId}`}
                    onClick={() => {
                      markRead(item.notifId);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        unread ? STATUS_DOT[item.status] : 'bg-gray-300'
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
                        {item.clientName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {item.medicineName}
                        {item.lastMessageAt
                          ? ` · ${timeAgo(item.lastMessageAt)}`
                          : ''}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { InquiryListResponse, InquiryStatus } from '@repo/contracts';
import { useUser } from './use-auth';

// The inquiry bell polls the officer's queue so new client activity surfaces
// without a manual refresh (the global SWR config disables focus revalidation,
// so this hook re-enables it below).
const POLL_MS = 15_000;

// How many awaiting-reply inquiries the bell renders at once.
export const INQUIRY_NOTIFICATION_DISPLAY_LIMIT = 20;

// Read state is per-user and browser-local (there's no server-side read state),
// so one officer's unread set never leaks into another on a shared machine.
const STORAGE_PREFIX = 'medfind:inquiry-notifications:read:';

function readKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function loadReadIds(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const raw = window.localStorage.getItem(readKey(userId));
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

// One awaiting-reply inquiry as shown in the bell. `notifId` is versioned by the
// message count, so a fresh client message on an already-read inquiry produces a
// new id and re-flags it as unread.
export interface InquiryNotification {
  notifId: string;
  inquiryId: string;
  clientName: string;
  medicineName: string;
  status: InquiryStatus;
  lastMessageAt: string | Date | null;
}

interface UseInquiryNotificationsReturn {
  notifications: InquiryNotification[] | undefined;
  unreadCount: number;
  isRead: (notifId: string) => boolean;
  markRead: (notifId: string) => void;
  markAllRead: () => void;
  isLoading: boolean;
  error: Error | undefined;
  enabled: boolean;
}

/**
 * Live "awaiting your reply" feed for the inquiry officer's notification bell.
 * Surfaces inquiries whose most recent message is from the CLIENT — a new
 * inquiry or a client reply — scoped server-side to the officer's own branch.
 */
export function useInquiryNotifications(): UseInquiryNotificationsReturn {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const enabled = user?.role === 'INQUIRY_OFFICER';
  const userId = user?.id;

  // Always the full queue (never a status-filtered view), so the bell reflects
  // every awaiting inquiry regardless of which tab the officer is viewing.
  const { data, error, isLoading } = useSWR<InquiryListResponse>(
    enabled ? '/inquiries' : null,
    { refreshInterval: POLL_MS, revalidateOnFocus: true },
  );

  // Awaiting a reply = the thread's last message is the client's AND it isn't
  // closed. A CLOSED inquiry is read-only for the client (they can't reply), so
  // a client-last-message closed thread was deliberately ended by the officer —
  // not something still needing attention. Newest client activity first.
  const notifications = useMemo<InquiryNotification[] | undefined>(() => {
    if (!data?.inquiries) return undefined;
    return data.inquiries
      .filter(
        (inquiry) =>
          inquiry.lastMessageSenderType === 'CLIENT' &&
          inquiry.status !== 'CLOSED',
      )
      .sort((a, b) => {
        const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, INQUIRY_NOTIFICATION_DISPLAY_LIMIT)
      .map((inquiry) => ({
        notifId: `${inquiry.id}:${inquiry.messageCount}`,
        inquiryId: inquiry.id,
        clientName: inquiry.clientName,
        medicineName: inquiry.medicineName,
        status: inquiry.status,
        lastMessageAt: inquiry.lastMessageAt,
      }));
  }, [data]);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load the persisted read set once the user is known.
  //
  // Unlike the super-admin activity bell, this one does NOT baseline the current
  // backlog as read on first load: awaiting inquiries are real pending work the
  // officer should see flagged on login, not historical noise. So a fresh
  // browser (empty read set) starts with every awaiting inquiry unread, and only
  // items the officer opens (or explicitly marks read) become read thereafter.
  useEffect(() => {
    if (!userId) return;
    setReadIds(loadReadIds(userId));
  }, [userId]);

  // State updates stay pure (no side effects) — React may double-invoke these.
  const markRead = useCallback((notifId: string) => {
    setReadIds((prev) =>
      prev.has(notifId) ? prev : new Set(prev).add(notifId),
    );
  }, []);

  const markAllRead = useCallback(() => {
    if (!notifications || notifications.length === 0) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((item) => next.add(item.notifId));
      return next;
    });
  }, [notifications]);

  // Persist the read set as a side effect (never inside a state updater), pruned
  // to ids still present in the feed so storage stays bounded as inquiries are
  // answered and scroll out of the awaiting set.
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    const feedIds = notifications?.map((item) => item.notifId);
    const pruned = feedIds
      ? new Set(feedIds.filter((id) => readIds.has(id)))
      : readIds;
    window.localStorage.setItem(readKey(userId), JSON.stringify([...pruned]));
  }, [userId, notifications, readIds]);

  const isRead = useCallback(
    (notifId: string) => readIds.has(notifId),
    [readIds],
  );

  const unreadCount = (notifications ?? []).reduce(
    (count, item) => (readIds.has(item.notifId) ? count : count + 1),
    0,
  );

  return {
    notifications,
    unreadCount,
    isRead,
    markRead,
    markAllRead,
    isLoading,
    error,
    enabled,
  };
}

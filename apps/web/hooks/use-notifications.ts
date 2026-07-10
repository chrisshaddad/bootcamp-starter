'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import type { AuditListResponse } from '@repo/contracts';
import { actionMeta } from '@/lib/audit-format';
import { useUser } from './use-auth';

// The notification feed is the platform audit log: every action recorded by the
// API surfaces here for the super admin. We poll it so the bell stays live
// without a manual refresh. The global SWR config disables focus revalidation,
// so this hook re-enables it (below) — otherwise a backgrounded tab never picks
// up another admin's activity, which reads as "notifications not syncing".
const POLL_MS = 15_000;

// How many recent events the bell renders. The list itself is capped by the API
// (500 most recent); the bell only ever shows the freshest handful.
export const NOTIFICATION_DISPLAY_LIMIT = 20;

// Read state is per-user and browser-local (there's no server-side read state),
// so one account's unread set never leaks into another on a shared machine. We
// track the exact ids the user has read, so a single notification can be marked
// read (decrementing the badge) independently of the rest.
const STORAGE_PREFIX = 'medfind:notifications:read:';

function readKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function toMillis(
  value: AuditListResponse['logs'][number]['createdAt'],
): number {
  return new Date(value).getTime();
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

interface UseNotificationsReturn {
  notifications: AuditListResponse['logs'] | undefined;
  unreadCount: number;
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  isLoading: boolean;
  error: Error | undefined;
  enabled: boolean;
}

/**
 * Live platform-activity feed for the super-admin notification bell. Reads the
 * audit log (super-admin only), polls for new events, toasts fresh activity, and
 * tracks which events the user has read via a browser-local id set.
 */
export function useNotifications(): UseNotificationsReturn {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const enabled = user?.role === 'SUPER_ADMIN';
  const userId = user?.id;

  const { data, error, isLoading } = useSWR<AuditListResponse>(
    enabled ? '/audit' : null,
    {
      refreshInterval: POLL_MS,
      // Override the global `revalidateOnFocus: false` so returning to the tab
      // immediately pulls in activity from other super admins.
      revalidateOnFocus: true,
    },
  );

  // A super admin doesn't need to be notified of their own actions — the feed is
  // for keeping tabs on other super admins and the pharmacies. Filter the actor
  // out here so it's excluded from the list, the unread count, and the toasts.
  const notifications = data?.logs?.filter((item) => item.userId !== userId);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load the persisted read set once the user is known.
  useEffect(() => {
    if (!userId) return;
    setReadIds(loadReadIds(userId));
  }, [userId]);

  // First time this browser sees the feed there's no read set yet. Baseline it
  // by marking the whole current backlog read, so the badge starts empty instead
  // of flagging every historical event; only genuinely new activity is unread.
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    if (window.localStorage.getItem(readKey(userId))) return;
    if (!notifications || notifications.length === 0) return;
    const ids = notifications.map((item) => item.id);
    window.localStorage.setItem(readKey(userId), JSON.stringify(ids));
    setReadIds(new Set(ids));
  }, [userId, notifications]);

  // Persist a new read set, pruned to ids still present in the feed so storage
  // stays bounded as old events scroll off the 500-row window.
  const persist = useCallback(
    (next: Set<string>) => {
      if (!userId || typeof window === 'undefined') return next;
      const feedIds = notifications?.map((item) => item.id);
      const pruned = feedIds
        ? new Set(feedIds.filter((id) => next.has(id)))
        : next;
      window.localStorage.setItem(readKey(userId), JSON.stringify([...pruned]));
      return pruned;
    },
    [userId, notifications],
  );

  const markRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        if (prev.has(id)) return prev;
        return persist(new Set(prev).add(id));
      });
    },
    [persist],
  );

  const markAllRead = useCallback(() => {
    if (!notifications || notifications.length === 0) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((item) => next.add(item.id));
      return persist(next);
    });
  }, [notifications, persist]);

  const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

  const unreadCount = (notifications ?? []).reduce(
    (count, item) => (readIds.has(item.id) ? count : count + 1),
    0,
  );

  // Pop a toast for genuinely new activity as it streams in, so the admin gets an
  // alert without opening the bell. `toastWatermark` starts unset and baselines
  // to the current newest event on first load, so the existing backlog never
  // replays as a burst of toasts; only events newer than the last poll alert.
  const toastWatermark = useRef<number | null>(null);
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    const newest = toMillis(notifications[0]!.createdAt);

    if (toastWatermark.current === null) {
      toastWatermark.current = newest;
      return;
    }
    if (newest <= toastWatermark.current) return;

    // Fresh events since the last poll (own actions are already filtered out of
    // `notifications`, so everything here is another admin's or a pharmacy's).
    const fresh = notifications.filter(
      (item) => toMillis(item.createdAt) > toastWatermark.current!,
    );
    toastWatermark.current = newest;

    if (fresh.length === 0) return;
    if (fresh.length > 3) {
      toast(`${fresh.length} new activities`, {
        description: 'Open the bell to review recent platform activity.',
      });
      return;
    }
    // Oldest → newest so the most recent toast sits on top of the stack.
    for (const item of [...fresh].reverse()) {
      toast(actionMeta(item.action).label, {
        description: item.userName ?? item.userEmail ?? 'System',
      });
    }
  }, [notifications]);

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

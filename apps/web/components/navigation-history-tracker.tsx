'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  readNavigationStack,
  writeNavigationStack,
  reduceNavigationStack,
} from '@/lib/navigation-stack';

/**
 * Mounted once in the root layout. Maintains a per-tab stack of visited
 * pathnames in sessionStorage so BackLink can show a real "Back to X"
 * destination even though Next's router doesn't expose history itself.
 *
 * Updates during render (not an effect) so the value is already up to date
 * by the time the newly-rendered page's own effects run.
 */
export function NavigationHistoryTracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  if (typeof window !== 'undefined' && lastPathname.current !== pathname) {
    writeNavigationStack(
      reduceNavigationStack(readNavigationStack(), pathname),
    );
    lastPathname.current = pathname;
  }

  return null;
}

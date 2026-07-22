'use client';

import { useLayoutEffect, useRef } from 'react';
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
 * Runs in a layout effect rather than during render — React guarantees every
 * layout effect in the tree runs before any passive effect fires, so this is
 * still done before BackLink's own (passive) effect on the newly-rendered
 * page, without mutating state during render.
 */
export function NavigationHistoryTracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (lastPathname.current === pathname) return;
    writeNavigationStack(
      reduceNavigationStack(readNavigationStack(), pathname),
    );
    lastPathname.current = pathname;
  }, [pathname]);

  return null;
}

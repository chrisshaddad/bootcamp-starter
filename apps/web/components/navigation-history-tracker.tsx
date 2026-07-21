'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';

const PREVIOUS_PATH_KEY = 'nav:previous';

/**
 * Mounted once in the root layout. Records the pathname we're navigating
 * away from into sessionStorage so BackLink can show a real "Back to X"
 * destination even though Next's router doesn't expose history itself.
 *
 * Writes during render (not an effect) so the value is already up to date
 * by the time the newly-rendered page's own effects run.
 */
export function NavigationHistoryTracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  if (lastPathname.current !== pathname) {
    if (lastPathname.current !== null) {
      window.sessionStorage.setItem(PREVIOUS_PATH_KEY, lastPathname.current);
    }
    lastPathname.current = pathname;
  }

  return null;
}

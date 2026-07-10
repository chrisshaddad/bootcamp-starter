'use client';

import { useEffect } from 'react';
import { useUser } from '@/hooks/use-auth';
import { applyTheme } from '@/lib/theme/apply-theme';

/**
 * Applies the logged-in user's gym brand color (if any) across the app.
 * Renders nothing — side-effect only. Mount once inside an authenticated
 * layout, after its loading/auth gate so there's no flash of the wrong color.
 */
export function ThemeProvider() {
  const { user } = useUser({ redirectOnUnauthenticated: false });

  useEffect(() => {
    applyTheme(user?.gymThemeColor ?? null);
    return () => applyTheme(null);
  }, [user?.gymThemeColor]);

  return null;
}

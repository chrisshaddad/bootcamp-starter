'use client';

import { useState, useEffect, useCallback } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'gym-theme-mode';

/** Hook that manages dark mode preference with localStorage persistence */
export function useDarkMode() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolvedDark, setResolvedDark] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setMode(stored);
    }
  }, []);

  // Apply the theme class and track resolved state
  useEffect(() => {
    const applyTheme = () => {
      let isDark: boolean;
      if (mode === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = mode === 'dark';
      }

      setResolvedDark(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    // Listen for system preference changes when in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode]);

  /** Cycle through modes: light → dark → system */
  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode =
        prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  /** Set a specific mode */
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, newMode);
    setMode(newMode);
  }, []);

  return { mode, resolvedDark, toggle, setThemeMode };
}

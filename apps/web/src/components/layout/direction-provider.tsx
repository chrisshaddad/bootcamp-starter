'use client';

import * as React from 'react';

import type { Direction, Locale } from '@/i18n/config';

type DirectionProviderProps = {
  children: React.ReactNode;
  direction: Direction;
  locale: Locale;
};

export function DirectionProvider({
  children,
  direction,
  locale,
}: DirectionProviderProps) {
  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [direction, locale]);

  return children;
}

'use client';

import { usePathname } from 'next/navigation';
import { locales, localeLabels } from '@/i18n/config';

type LocaleSwitcherProps = {
  currentLocale: string;
  /** "light" = white text for dark backgrounds (landing nav default)
   *  "muted" = foreground/muted-foreground for light topbars (dashboard) */
  variant?: 'light' | 'muted';
};

export function LocaleSwitcher({
  currentLocale,
  variant = 'light',
}: LocaleSwitcherProps) {
  const pathname = usePathname();

  function switchTo(locale: string) {
    const segments = pathname.split('/');
    segments[1] = locale;
    return segments.join('/');
  }

  const activeClass =
    variant === 'muted' ? 'text-foreground font-semibold' : 'text-white';
  const inactiveClass =
    variant === 'muted'
      ? 'text-muted-foreground hover:text-foreground'
      : 'text-white/50 hover:text-white/80';

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && (
            <span className="mx-1 text-border select-none" aria-hidden>
              |
            </span>
          )}
          <a
            href={switchTo(l)}
            className={[
              'font-medium transition-colors',
              l === currentLocale ? activeClass : inactiveClass,
            ].join(' ')}
          >
            {localeLabels[l]}
          </a>
        </span>
      ))}
    </div>
  );
}

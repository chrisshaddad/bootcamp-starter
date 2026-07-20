'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shared money formatter for the dashboards. Matches the reports page: a plain
 * 2-dp number (no currency symbol), since the reports/invoice figures are stored
 * as bare decimal strings without a currency dimension.
 */
export function useMoney(locale: string) {
  return useMemo(
    () =>
      new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );
}

/**
 * KpiTile — the shared stat tile for the role dashboards (Sprint D1).
 *
 * A dashboard is an overview of headline numbers, so the right "form" (per the
 * dataviz form heuristic) is a stat tile, not a chart. Optionally links into the
 * relevant module. `OccupancyMeter` is the one plotted mark — a single-hue
 * sequential bar reusing the CVD-validated blue from the reports page.
 */

/** dataviz sequential single-hue (magnitude); validated on the reports page. */
export const METER_COLOR = '#2a78d6';

type Tone = 'neutral' | 'positive' | 'negative';

const toneClass: Record<Tone, string> = {
  neutral: 'text-foreground',
  positive: 'text-emerald-600',
  negative: 'text-red-600',
};

interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: Tone;
  /** Locale-prefixed href, e.g. `/en/dashboard/reports`. Makes the whole tile a link. */
  href?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

export function KpiTile({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
  href,
  loading = false,
  children,
}: KpiTileProps) {
  if (loading) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/70">
          {href ? (
            <>
              {/* icon at rest, arrow affordance on hover */}
              <span className="inline-flex group-hover:hidden">{icon}</span>
              <ArrowUpRightIcon
                className="hidden size-4 group-hover:inline-flex"
                aria-hidden
              />
            </>
          ) : (
            icon
          )}
        </span>
      </div>
      <span
        className={`text-2xl font-semibold tracking-tight tabular-nums ${toneClass[tone]}`}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {children}
    </>
  );

  const base = 'flex flex-col gap-2 rounded-xl border bg-card p-4';

  if (href) {
    return (
      <Link
        href={href}
        className={`group transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${base}`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}

/** Single-hue sequential meter (occupancy %). */
export function OccupancyMeter({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${clamped}%`, backgroundColor: METER_COLOR }}
      />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';
import { cn } from '@/lib/utils';

// Semantic tones for the icon chip + top accent. Keeps the dashboard's colour
// language consistent: brand-green for capacity, amber/red for things that need
// attention, blue for informational counts.
export type StatTone = 'brand' | 'success' | 'info' | 'warning' | 'critical';

const TONE: Record<StatTone, { chip: string; accent: string }> = {
  brand: { chip: 'bg-primary-100 text-primary-hover', accent: 'bg-primary-base' },
  success: { chip: 'bg-success/10 text-success', accent: 'bg-success' },
  info: { chip: 'bg-blue/10 text-blue', accent: 'bg-blue' },
  warning: { chip: 'bg-warn-soft text-warn', accent: 'bg-warn-accent' },
  critical: { chip: 'bg-error/10 text-error', accent: 'bg-error' },
};

export interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: StatTone;
  href?: string;
  /** Short qualifier shown under the value, e.g. "across 3 branches". */
  hint?: string;
  isLoading?: boolean;
  /** Stagger delay for the shared entrance animation. */
  delayMs?: number;
}

/**
 * A single headline KPI tile: coloured icon chip, big value, optional hint, and
 * a thin top accent in the tone colour. Renders as a link into the console that
 * owns the metric when `href` is given. Shared across the dashboard so every
 * tile is pixel-identical.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  href,
  hint,
  isLoading = false,
  delayMs = 0,
}: StatCardProps) {
  const tokens = TONE[tone];

  const body = (
    <Card
      className={cn(
        'relative h-full overflow-hidden rounded-2xl border-transparent py-0 shadow-sm transition-shadow',
        href && 'hover:shadow-md',
        ENTER,
      )}
      style={enterStyle(delayMs)}
    >
      <span
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-1', tokens.accent)}
      />
      <CardContent className="flex items-start gap-3 p-4 pt-5">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            tokens.chip,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm text-gray-500">{label}</p>
            {href ? (
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-primary-hover" />
            ) : null}
          </div>
          {isLoading ? (
            <Skeleton className="mt-1.5 h-7 w-10" />
          ) : (
            <p className="text-2xl font-bold leading-tight text-gray-900">
              {value.toLocaleString()}
            </p>
          )}
          {hint && !isLoading ? (
            <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return body;

  return (
    <Link href={href} className="group block">
      {body}
    </Link>
  );
}

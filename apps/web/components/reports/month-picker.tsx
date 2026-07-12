'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface MonthPickerProps {
  /** Selected year. */
  year: number;
  /** Selected month, 1-based (1 = January). */
  month: number;
  onChange: (year: number, month: number) => void;
  /** Earliest selectable year in the stepper. */
  minYear?: number;
}

/**
 * Calendar-style month + year selector. The year stepper moves between years;
 * the 3×4 grid picks the month. Future months (beyond the current one) are
 * disabled so users can't request a report for a period that hasn't happened.
 */
export function MonthPicker({
  year,
  month,
  onChange,
  minYear = 2015,
}: MonthPickerProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const isFuture = (m: number) =>
    year > currentYear || (year === currentYear && m > currentMonth);

  return (
    <div className="w-[420px] max-w-full rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Year stepper */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground disabled:opacity-30"
          onClick={() => onChange(year - 1, month)}
          disabled={year <= minYear}
          aria-label="Previous year"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-bold text-foreground tabular-nums">
          {year}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground disabled:opacity-30"
          onClick={() => onChange(year + 1, month)}
          disabled={year >= currentYear}
          aria-label="Next year"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-2">
        {MONTHS_SHORT.map((label, i) => {
          const m = i + 1;
          const selected = m === month;
          const disabled = isFuture(m);
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(year, m)}
              className={cn(
                'h-10 rounded-lg text-sm font-semibold transition-colors',
                selected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                disabled && 'pointer-events-none opacity-30',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

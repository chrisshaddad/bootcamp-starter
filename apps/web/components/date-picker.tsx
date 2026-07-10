'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isValid, parse } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// The wire/storage format. The value in and out is always 'YYYY-MM-DD' (or '').
const ISO = 'yyyy-MM-dd';

function parseIso(value: string): Date | undefined {
  if (!value) return undefined;
  const date = parse(value, ISO, new Date());
  return isValid(date) ? date : undefined;
}

/**
 * A real calendar date picker (react-day-picker) behind a button trigger — no
 * free-text typing, so no MM/DD vs DD/MM ambiguity. The caption has a year
 * dropdown so far-back dates (e.g. a 1956 birthday) are one click, not 800.
 * Future dates are disabled. Controlled: value is a 'YYYY-MM-DD' string.
 */
export function DatePicker({
  value,
  onChange,
  onBlur,
  id,
  invalid,
  placeholder = 'Select a date',
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = parseIso(value);
  const today = new Date();

  // Close on outside click (and fire blur so RHF marks the field touched).
  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onBlur]);

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-left text-sm outline-none hover:bg-gray-50 focus-visible:border-primary-base focus-visible:ring-2 focus-visible:ring-primary-200',
          invalid && 'border-error',
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <span
          className={cn('flex-1', selected ? 'text-gray-900' : 'text-gray-400')}
        >
          {selected ? format(selected, 'PP') : placeholder}
        </span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 rounded-[10px] border border-gray-200 bg-white p-3 shadow-lg">
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected ?? today}
            captionLayout="dropdown"
            startMonth={new Date(1920, 0)}
            endMonth={today}
            disabled={{ after: today }}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, ISO));
              setOpen(false);
              onBlur?.();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

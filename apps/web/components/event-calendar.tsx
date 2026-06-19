'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Event } from '@repo/contracts';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EventCalendarProps {
  events: Event[] | undefined;
  isLoading?: boolean;
  className?: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function groupEventsByDate(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();
  for (const event of events) {
    const key = toDateKey(new Date(event.startsAt));
    const existing = map.get(key) ?? [];
    existing.push(event);
    map.set(key, existing);
  }
  for (const [, dayEvents] of map) {
    dayEvents.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }
  return map;
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: Array<{
    date: Date;
    inCurrentMonth: boolean;
    dateKey: string;
  }> = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    cells.push({
      date,
      inCurrentMonth: false,
      dateKey: toDateKey(date),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({
      date,
      inCurrentMonth: true,
      dateKey: toDateKey(date),
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const date = new Date(year, month + 1, i);
    cells.push({
      date,
      inCurrentMonth: false,
      dateKey: toDateKey(date),
    });
  }

  return cells;
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function formatDayHeading(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEventTime(value: string | Date) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventCalendar({
  events,
  isLoading = false,
  className,
}: EventCalendarProps) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const eventsByDate = useMemo(() => groupEventsByDate(events ?? []), [events]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const selectedEvents = selectedDateKey
    ? (eventsByDate.get(selectedDateKey) ?? [])
    : [];
  const selectedDate = selectedDateKey
    ? new Date(`${selectedDateKey}T12:00:00`)
    : null;

  function goToPreviousMonth() {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  }

  function goToNextMonth() {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  }

  function goToToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function handleDayClick(dateKey: string, hasEvents: boolean) {
    if (!hasEvents) return;
    setSelectedDateKey(dateKey);
  }

  function handleEventClick(eventId: string) {
    setSelectedDateKey(null);
    router.push(`/events/${eventId}`);
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-gray-300',
          className,
        )}
      >
        <Skeleton className="h-14 rounded-none" />
        <div className="grid grid-cols-7 gap-px bg-gray-300 p-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-square rounded-none bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-gray-300 shadow-sm',
          className,
        )}
      >
        <div className="flex items-center justify-between bg-gray-800 px-4 py-3 text-white">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-gray-700 hover:text-white"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>

          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
            <h2 className="text-lg font-bold tracking-wide uppercase">
              {formatMonthYear(year, month)}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="border-gray-500 bg-transparent text-white hover:bg-gray-700 hover:text-white"
              onClick={goToToday}
            >
              Today
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-gray-700 hover:text-white"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-300 bg-gray-200">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-r border-gray-300 px-1 py-2 text-center text-xs font-bold tracking-wider text-gray-700 uppercase last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-300">
          {cells.map(({ date, inCurrentMonth, dateKey }) => {
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const hasEvents = dayEvents.length > 0;
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDateKey;

            return (
              <button
                key={dateKey}
                type="button"
                disabled={!hasEvents}
                onClick={() => handleDayClick(dateKey, hasEvents)}
                className={cn(
                  'relative flex min-h-[4.5rem] flex-col items-stretch p-1.5 text-left transition-colors sm:min-h-[5.5rem] sm:p-2',
                  inCurrentMonth ? 'bg-white' : 'bg-gray-100',
                  hasEvents &&
                    'cursor-pointer hover:bg-primary-100 focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:outline-none',
                  !hasEvents && 'cursor-default',
                  isSelected &&
                    'bg-primary-100 ring-2 ring-inset ring-primary-base',
                  isToday &&
                    !isSelected &&
                    'ring-2 ring-inset ring-secondary-base',
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    inCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                    isToday && 'text-primary-base',
                  )}
                >
                  {date.getDate()}
                </span>

                {hasEvents && (
                  <div className="mt-auto space-y-1">
                    <div className="flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            'h-1.5 flex-1 rounded-full',
                            event.isUpcoming === false
                              ? 'bg-gray-400'
                              : 'bg-primary-base',
                          )}
                        />
                      ))}
                    </div>
                    <span className="block truncate text-[10px] font-medium text-gray-600 sm:text-xs">
                      {dayEvents.length === 1
                        ? dayEvents[0]!.eventName
                        : `${dayEvents.length} events`}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={selectedDateKey !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDateKey(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? formatDayHeading(selectedDate) : 'Events'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvents.length}{' '}
              {selectedEvents.length === 1 ? 'event' : 'events'} scheduled
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {selectedEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => handleEventClick(event.id)}
                  className="hover:bg-primary-100 focus-visible:ring-primary-base w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <p className="font-semibold text-gray-900">
                    {event.eventName}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                    <Clock className="size-3.5 shrink-0" />
                    {formatEventTime(event.startsAt)}
                    {event.presenter?.username && (
                      <span className="text-gray-400">
                        · {event.presenter.username}
                      </span>
                    )}
                  </p>
                  {event.isRegistered && (
                    <span className="mt-2 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Registered
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

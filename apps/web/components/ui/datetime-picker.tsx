'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIME_OPTIONS = Array.from({ length: 96 }).map((_, i) => {
  const hour = Math.floor(i / 4)
    .toString()
    .padStart(2, '0');
  const minute = ((i % 4) * 15).toString().padStart(2, '0');
  return `${hour}:${minute}`;
});

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
  minDate,
}: DateTimePickerProps) {
  // Parse incoming value "2023-10-25T14:30"
  const parsedDate = value ? new Date(value) : undefined;

  const [date, setDate] = React.useState<Date | undefined>(
    parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : undefined,
  );

  const [time, setTime] = React.useState<string>(
    value && value.includes('T')
      ? value.split('T')[1]!.substring(0, 5)
      : '12:00',
  );

  React.useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setDate(d);
        if (value.includes('T')) {
          setTime(value.split('T')[1]!.substring(0, 5));
        }
      }
    }
  }, [value]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onChange(`${dateStr}T${time}`);
    } else {
      onChange('');
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (date && newTime) {
      const dateStr = format(date, 'yyyy-MM-dd');
      onChange(`${dateStr}T${newTime}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal bg-white',
            !value && 'text-gray-500',
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {date && !isNaN(date.getTime())
              ? format(
                  new Date(`${format(date, 'yyyy-MM-dd')}T${time}`),
                  'MMM d, yyyy h:mm a',
                )
              : 'Pick a date & time'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={(d) => {
            if (!minDate) return false;
            const min = new Date(minDate);
            min.setHours(0, 0, 0, 0);
            return d < min;
          }}
        />
        <div className="p-3 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center text-sm font-medium text-gray-700">
            <Clock className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
            Time
          </div>
          <Select value={time} onValueChange={handleTimeChange}>
            <SelectTrigger className="w-[120px] h-8 text-sm bg-white">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {format(new Date(`2000-01-01T${t}`), 'h:mm a')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

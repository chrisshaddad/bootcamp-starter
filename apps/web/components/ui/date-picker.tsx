'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  value?: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  disabled?: boolean;
  minDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  minDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Use T00:00:00 to ensure we parse the local date correctly
  const date = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
              ? format(date, 'PPP')
              : 'Pick a date'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange(d ? format(d, 'yyyy-MM-dd') : '');
            setIsOpen(false);
          }}
          disabled={(d) => {
            if (!minDate) return false;
            const min = new Date(minDate);
            min.setHours(0, 0, 0, 0);
            return d < min;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

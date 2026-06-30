'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
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

interface TimePickerProps {
  value?: string; // HH:mm
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Select time" />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[200px]">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t}>
            {format(new Date(`2000-01-01T${t}`), 'h:mm a')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

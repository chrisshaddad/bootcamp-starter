"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/** Thin wrapper over the Base UI Select with a simple, controlled API. */
export function FormSelect<T extends string>({
  value,
  onValueChange,
  placeholder,
  options,
  className,
  id,
}: {
  value: T | null | undefined;
  onValueChange: (value: T) => void;
  placeholder?: string;
  options: SelectOption<T>[];
  className?: string;
  id?: string;
}) {
  return (
    <Select
      value={value ?? null}
      onValueChange={(v) => {
        if (v != null) onValueChange(v as T);
      }}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

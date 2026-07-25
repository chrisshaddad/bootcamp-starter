'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Fired as the search text changes — wire to a debounced remote query. */
  onSearchChange?: (search: string) => void;
  /**
   * When provided, typing a name with no exact match offers a "Create ..."
   * row that calls this and selects the result. The caller owns persisting
   * the new row (e.g. a resource's create() mutation); this component only
   * needs the created `{ value, label }` back to select it immediately,
   * without waiting on the option list (owned by the caller) to catch up.
   */
  onCreate?: (query: string) => Promise<ComboboxOption>;
  /** Shows a clear ("x") affordance on the trigger once a value is selected. */
  clearable?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable single-select combobox (Popover + cmdk Command). When
 * `onSearchChange` is provided, client-side filtering is disabled so the caller
 * can drive results from a remote query. Presentational primitive — sibling of
 * `multi-select.tsx`.
 */
export function Combobox({
  options,
  value,
  onChange,
  onSearchChange,
  onCreate,
  clearable,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  loading,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  // The newly-created option, held locally until the caller's option list
  // (fetched elsewhere) catches up and includes it too.
  const [pending, setPending] = React.useState<ComboboxOption | null>(null);

  const selected =
    options.find((o) => o.value === value) ??
    (pending?.value === value ? pending : undefined);
  const remote = typeof onSearchChange === 'function';

  const trimmedSearch = search.trim();
  const hasExactMatch = options.some(
    (o) => o.label.toLowerCase() === trimmedSearch.toLowerCase(),
  );
  const canCreate = !!onCreate && trimmedSearch.length > 0 && !hasExactMatch;
  const createLabel = `Create "${trimmedSearch}"`;

  const handleCreate = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(trimmedSearch);
      setPending(created);
      onChange(created.value);
      setOpen(false);
      setSearch('');
    } catch {
      // The caller's onCreate is responsible for surfacing the error (e.g. a
      // toast) - swallow here so the popover just stays open for a retry
      // instead of throwing an unhandled rejection out of cmdk's onSelect.
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={!remote}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={(v) => {
              setSearch(v);
              onSearchChange?.(v);
            }}
          />
          <CommandList>
            {!canCreate && (
              <CommandEmpty>{loading ? 'Searching…' : emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={remote ? option.value : option.label}
                  onSelect={() => {
                    onChange(option.value === value ? null : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
              {canCreate && (
                <CommandItem
                  value={createLabel}
                  disabled={creating}
                  onSelect={handleCreate}
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {createLabel}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

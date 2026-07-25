'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /**
   * When provided, typing a name with no exact match offers a "Create ..."
   * row that calls this and adds the result to the selection. The caller
   * owns persisting the new row; this component only needs the created
   * `{ value, label }` back, without waiting on the option list (owned by
   * the caller) to catch up.
   */
  onCreate?: (query: string) => Promise<MultiSelectOption>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A searchable multi-select combobox (Popover + cmdk Command + Badge chips).
 * A presentational primitive reused by resource forms (e.g. a book's authors
 * and categories) — not a resource-specific abstraction.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  onCreate,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  // Newly-created options, held locally until the caller's option list
  // (fetched elsewhere) catches up and includes them too.
  const [pending, setPending] = React.useState<MultiSelectOption[]>([]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const allOptions = React.useMemo(() => {
    const known = new Set(options.map((o) => o.value));
    return [...options, ...pending.filter((o) => !known.has(o.value))];
  }, [options, pending]);

  const trimmedSearch = search.trim();
  const hasExactMatch = allOptions.some(
    (o) => o.label.toLowerCase() === trimmedSearch.toLowerCase(),
  );
  const canCreate = !!onCreate && trimmedSearch.length > 0 && !hasExactMatch;
  const createLabel = `Create "${trimmedSearch}"`;

  const handleCreate = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(trimmedSearch);
      setPending((prev) => [...prev, created]);
      onChange([...selected, created.value]);
      setSearch('');
    } catch {
      // The caller's onCreate is responsible for surfacing the error (e.g. a
      // toast) - swallow here so the popover just stays open for a retry
      // instead of throwing an unhandled rejection out of cmdk's onSelect.
    } finally {
      setCreating(false);
    }
  };

  const selectedOptions = allOptions.filter((o) => selected.includes(o.value));

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
          className={cn(
            'h-auto min-h-9 w-full justify-between gap-2 px-3 py-2',
            className,
          )}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground font-normal">
                {placeholder}
              </span>
            ) : (
              selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(option.value);
                  }}
                >
                  {option.label}
                  <X className="h-3 w-3" />
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={setSearch}
          />
          <CommandList>
            {!canCreate && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {allOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
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

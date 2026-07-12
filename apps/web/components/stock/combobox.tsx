'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Single-value "pick an existing value or type a new one" combobox. Lifted from
// the super-admin medicines form so the pharmacy stock form matches it exactly.

const WHITE_SCROLLBAR =
  '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300';

// Only render this many matches at once so huge value lists never bog the
// dropdown down — the search box narrows the rest.
const OPTION_LIMIT = 50;

const COMBO_PANEL =
  'absolute z-50 mt-1 w-full overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-lg';

const COMBO_OPTION =
  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100';

// Close the panel on an outside click.
function useDismissable() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open]);

  return { open, setOpen, ref };
}

// When the dropdown opens, scroll it into view so options near the bottom of a
// dialog are never hidden.
function useScrollIntoViewOnOpen(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [open]);
  return ref;
}

export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder,
  labelFor,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  labelFor?: (value: string) => string;
}) {
  const { open, setOpen, ref } = useDismissable();
  const panelRef = useScrollIntoViewOnOpen(open);
  const render = (raw: string) => (labelFor ? labelFor(raw) : raw);

  const trimmed = value.trim();
  const needle = trimmed.toLowerCase();
  // When the field already holds an exact option (i.e. one was picked), show the
  // whole list so you can switch without clearing first. Only filter while the
  // user is actively typing something new.
  const isExact = options.some((option) => option === trimmed);
  const filtered =
    needle && !isExact
      ? options.filter(
          (option) =>
            option.toLowerCase().includes(needle) ||
            render(option).toLowerCase().includes(needle),
        )
      : options;
  const shown = filtered.slice(0, OPTION_LIMIT);
  const hidden = filtered.length - shown.length;

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {open && shown.length > 0 ? (
        <div ref={panelRef} className={COMBO_PANEL}>
          <div className={cn('max-h-56 overflow-y-auto p-1', WHITE_SCROLLBAR)}>
            {shown.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                className={COMBO_OPTION}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span className="truncate">{render(option)}</span>
                {value === option ? (
                  <Check className="h-4 w-4 shrink-0 text-gray-400" />
                ) : null}
              </button>
            ))}
            {hidden > 0 ? (
              <p className="px-3 py-1.5 text-xs text-gray-400">
                +{hidden} more — keep typing to narrow
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Multi-value creatable combobox — shows chosen values as removable chips and
// lets you add existing options or type new ones. Lifted from the super-admin
// medicines form (ingredients) so stock manages ingredients the same way.
export function MultiCombobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
}) {
  const { open, setOpen, ref } = useDismissable();
  const panelRef = useScrollIntoViewOnOpen(open);
  const [input, setInput] = useState('');

  const selected = value;

  const has = (token: string) =>
    selected.some((item) => item.toLowerCase() === token.toLowerCase());

  const addToken = (token: string) => {
    const clean = token.trim();
    if (clean.length > 0 && !has(clean)) onChange([...selected, clean]);
    setInput('');
  };

  const removeToken = (token: string) =>
    onChange(selected.filter((item) => item !== token));

  const needle = input.trim().toLowerCase();
  const available = options.filter(
    (option) =>
      !has(option) && (needle ? option.toLowerCase().includes(needle) : true),
  );
  const shown = available.slice(0, OPTION_LIMIT);
  const hidden = available.length - shown.length;
  const canCreate =
    needle.length > 0 &&
    !options.some((option) => option.toLowerCase() === needle) &&
    !has(input.trim());

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full flex-wrap items-center gap-1.5 rounded-[10px] border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-success focus-within:ring-[3px] focus-within:ring-success/20"
      >
        {selected.map((token) => (
          <span
            key={token}
            className="inline-flex items-center gap-1 rounded-md bg-primary-100 py-1 pr-1 pl-2 text-xs font-medium text-primary-hover"
          >
            {token}
            <button
              type="button"
              aria-label={`Remove ${token}`}
              onClick={(event) => {
                event.stopPropagation();
                removeToken(token);
              }}
              className="rounded-sm p-0.5 hover:bg-primary-200"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          autoComplete="off"
          placeholder={selected.length === 0 ? placeholder : ''}
          onChange={(event) => {
            setInput(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (input.trim()) addToken(input);
            } else if (
              event.key === 'Backspace' &&
              input === '' &&
              selected.length > 0
            ) {
              removeToken(selected[selected.length - 1]!);
            } else if (event.key === 'Escape' && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }
          }}
          className="min-w-[8rem] flex-1 bg-transparent py-1 outline-none placeholder:text-gray-500"
        />
      </div>

      {open && (shown.length > 0 || canCreate) ? (
        <div ref={panelRef} className={COMBO_PANEL}>
          <div className={cn('max-h-56 overflow-y-auto p-1', WHITE_SCROLLBAR)}>
            {canCreate ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                className={COMBO_OPTION}
                onClick={() => addToken(input)}
              >
                <span className="truncate">Add “{input.trim()}”</span>
              </button>
            ) : null}
            {shown.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                className={COMBO_OPTION}
                onClick={() => addToken(option)}
              >
                <span className="truncate">{option}</span>
              </button>
            ))}
            {hidden > 0 ? (
              <p className="px-3 py-1.5 text-xs text-gray-400">
                +{hidden} more — keep typing to narrow
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

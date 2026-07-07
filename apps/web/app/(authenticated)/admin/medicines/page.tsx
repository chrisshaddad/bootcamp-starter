'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Barcode,
  Check,
  ChevronDown,
  CircleDollarSign,
  CircleOff,
  Pencil,
  Pill,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  medicineCreateRequestSchema,
  type MedicineCreateRequest,
  type MedicineFilter,
  type MedicineResponse,
} from '@repo/contracts';
import {
  useMedicines,
  useMedicineActions,
  useMedicineFacets,
  useMedicineIngredientOptions,
  useMedicineStats,
} from '@/hooks/use-medicines';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 20;

// A clean, light scrollbar (white track, soft grey thumb) for scroll areas.
const WHITE_SCROLLBAR =
  '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300';

function formatPrice(value: number | null): string {
  if (value === null) return '—';
  return `${new Intl.NumberFormat('en-US').format(value)} LBP`;
}

function formatDate(value: MedicineResponse['createdAt']): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------

function MedicineIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
      <Pill className="h-5 w-5" />
    </div>
  );
}

// The `type` column is seeded from the MOPH drug workbook's "B/G" column, so
// the raw values are "B" (brand) and "G" (generic). Show a friendly label.
function typeLabel(type: string): string {
  const key = type.trim().toUpperCase();
  if (key === 'B') return 'Brand';
  if (key === 'G') return 'Generic';
  return type;
}

// The inverse of `typeLabel`: turn the friendly label the form shows back into
// the stored code so the DB keeps "B"/"G" (other types pass through unchanged).
function typeValue(label: string): string {
  const key = label.trim().toLowerCase();
  if (key === 'brand') return 'B';
  if (key === 'generic') return 'G';
  return label.trim();
}

function TypePill({ type }: { type: string }) {
  const key = type.trim().toUpperCase();
  const style =
    key === 'B'
      ? 'bg-primary-100 text-primary-hover'
      : key === 'G'
        ? 'bg-success/10 text-success-dark'
        : 'bg-gray-100 text-gray-600';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        style,
      )}
    >
      {typeLabel(type)}
    </span>
  );
}

// The `quick` value each card applies when clicked — the cards double as a
// segmented quick-filter over price/barcode completeness.
type QuickFilter = 'all' | 'priced' | 'unpriced' | 'missingBarcode';

interface StatTile {
  key: QuickFilter;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  ringClass: string;
}

const STAT_TILES: StatTile[] = [
  {
    key: 'all',
    label: 'Total medicines',
    icon: Pill,
    iconClass: 'bg-primary-100 text-primary-hover',
    ringClass: 'ring-primary-base',
  },
  {
    key: 'priced',
    label: 'Priced',
    icon: CircleDollarSign,
    iconClass: 'bg-success/10 text-success-dark',
    ringClass: 'ring-success',
  },
  {
    key: 'unpriced',
    label: 'Missing price',
    icon: CircleOff,
    iconClass: 'bg-warning/15 text-warning-dark',
    ringClass: 'ring-warning',
  },
  {
    key: 'missingBarcode',
    label: 'Missing barcode',
    icon: Barcode,
    iconClass: 'bg-gray-100 text-gray-600',
    ringClass: 'ring-gray-400',
  },
];

// Merge the active selection into an options list so a chosen value always
// appears in its dropdown, even if faceting narrowed it out.
function withSelected(
  options: string[] | undefined,
  selected?: string,
): string[] {
  const base = options ?? [];
  if (selected && !base.includes(selected)) return [selected, ...base];
  return base;
}

// Close-on-outside-click behavior shared by the custom dropdowns below.
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

// When a dropdown opens, scroll it into view so you never have to scroll the
// dialog manually to see the options (esp. for fields near the bottom).
function useScrollIntoViewOnOpen(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [open]);
  return ref;
}

// Only render this many matches at once so huge value lists (e.g. thousands of
// dosages) never bog the dropdown down — the search box narrows the rest.
const OPTION_LIMIT = 50;

const COMBO_PANEL =
  'absolute z-50 mt-1 w-full overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-lg';

const COMBO_OPTION =
  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100';

// A themed, searchable single-select for the table filters.
function FilterCombobox({
  allLabel,
  value,
  options,
  onChange,
  width,
  labelFor,
}: {
  allLabel: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string | undefined) => void;
  width: string;
  labelFor?: (value: string) => string;
}) {
  const { open, setOpen, ref } = useDismissable();
  const [query, setQuery] = useState('');
  const render = (raw: string) => (labelFor ? labelFor(raw) : raw);

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((option) => render(option).toLowerCase().includes(needle))
    : options;
  const shown = filtered.slice(0, OPTION_LIMIT);
  const hidden = filtered.length - shown.length;

  const choose = (next: string | undefined) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} className={cn('relative', width)}>
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full justify-between font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={cn('truncate', value ? 'text-gray-900' : 'text-gray-500')}
        >
          {value ? render(value) : allLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </Button>

      {open ? (
        <div className={COMBO_PANEL}>
          <div className="border-b border-gray-100 p-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
              }}
              placeholder="Search…"
              className="h-8"
            />
          </div>
          <div className={cn('max-h-60 overflow-y-auto p-1', WHITE_SCROLLBAR)}>
            <button
              type="button"
              className={COMBO_OPTION}
              onClick={() => choose(undefined)}
            >
              {allLabel}
              {value === undefined ? (
                <Check className="h-4 w-4 shrink-0 text-gray-400" />
              ) : null}
            </button>
            {shown.map((option) => (
              <button
                key={option}
                type="button"
                className={COMBO_OPTION}
                onClick={() => choose(option)}
              >
                <span className="truncate">{render(option)}</span>
                {value === option ? (
                  <Check className="h-4 w-4 shrink-0 text-gray-400" />
                ) : null}
              </button>
            ))}
            {shown.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
            ) : null}
            {hidden > 0 ? (
              <p className="px-3 py-1.5 text-xs text-gray-400">
                +{hidden} more — refine your search
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// A themed, creatable combobox for the add/edit form: type any value, or pick
// an existing one from the suggestions. Replaces the native <datalist>, whose
// popup is drawn by the OS and doesn't match the app theme.
function CreatableCombobox({
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
  // whole list so you can switch to another without clearing it first. Only
  // filter while the user is actively typing something new.
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
        // Reopen when clicking an already-focused field (focus won't re-fire).
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          // Close the suggestions on Esc without closing the whole dialog.
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
                // Keep the input focused so the click registers cleanly.
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

// Multi-value creatable combobox for ingredients. A medicine can have several
// ingredients (the `Ingredient` relation); this shows them as chips and lets
// you add existing ones or type new ones. Same look/logic as the single-value
// combobox above, but works on an array of names.
function MultiCombobox({
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

// ---------------------------------------------------------------------------
// Barcode reader field
//
// Barcodes are captured from a hardware reader, never hand-typed. A USB/BT
// scanner behaves like a keyboard: it emits the code as a rapid keystroke burst
// terminated by Enter. While "scanning", we listen on the window, buffer those
// keystrokes, and commit on Enter. The 120ms gap guard drops slow (human)
// keystrokes, so the field can only be filled by an actual scan.

function BarcodeScanField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const bufferRef = useRef('');
  const lastKeyRef = useRef(0);

  useEffect(() => {
    if (!scanning) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Cancel the scan only — don't let Esc bubble up and close the dialog.
        event.preventDefault();
        event.stopPropagation();
        bufferRef.current = '';
        setScanning(false);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        setScanning(false);
        if (code) onChange(code);
        return;
      }
      if (event.key.length === 1) {
        event.preventDefault();
        const now = Date.now();
        // A long pause means a human is typing — reset so it never registers.
        if (now - lastKeyRef.current > 120) bufferRef.current = '';
        lastKeyRef.current = now;
        bufferRef.current += event.key;
      }
    }

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [scanning, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <div
            className={cn(
              'flex h-14 w-full items-center rounded-[10px] border border-gray-300 pr-3 pl-9 text-sm transition-[color,box-shadow]',
              scanning && 'border-success ring-[3px] ring-success/20',
            )}
          >
            {scanning ? (
              <span className="text-gray-500">
                Listening for scanner… press Esc to cancel
              </span>
            ) : value ? (
              <span className="font-mono text-gray-900">{value}</span>
            ) : (
              <span className="text-gray-400">No barcode — scan to add</span>
            )}
          </div>
        </div>
        {value && !scanning ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-14"
            onClick={() => onChange('')}
          >
            Clear
          </Button>
        ) : null}
        <Button
          type="button"
          variant={scanning ? 'secondary' : 'outline'}
          size="lg"
          className="h-14"
          onClick={() => setScanning((current) => !current)}
        >
          <ScanLine className="h-4 w-4" />
          {scanning ? 'Cancel' : value ? 'Rescan' : 'Scan'}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Use a USB or Bluetooth barcode reader — keystrokes are captured
        automatically while scanning.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / edit form

interface MedicineFormValues {
  brandName: string;
  mophId: string;
  atcCode: string;
  type: string;
  dosage: string;
  form: string;
  ingredients: string[];
  barcode: string;
  priceLbp: string;
}

function toFormValues(medicine?: MedicineResponse | null): MedicineFormValues {
  return {
    brandName: medicine?.brandName ?? '',
    mophId: medicine?.mophId ?? '',
    atcCode: medicine?.atcCode ?? '',
    // Show the friendly label ("Brand"/"Generic") in the form; converted back
    // to the stored code on submit.
    type: medicine?.type ? typeLabel(medicine.type) : '',
    dosage: medicine?.dosage ?? '',
    form: medicine?.form ?? '',
    ingredients: medicine?.ingredients ?? [],
    barcode: medicine?.barcode ?? '',
    priceLbp: medicine?.priceLbp != null ? String(medicine.priceLbp) : '',
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
      {children}
    </p>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

function MedicineFormDialog({
  medicine,
  onClose,
}: {
  medicine?: MedicineResponse | null;
  onClose: () => void;
}) {
  const { createMedicine, updateMedicine } = useMedicineActions();
  const isEdit = Boolean(medicine);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(medicineCreateRequestSchema),
    defaultValues: toFormValues(medicine),
  });

  const barcode = watch('barcode') ?? '';

  // Unfiltered facets power the "pick an existing value or type a new one"
  // comboboxes for type / form / dosage; ingredients come from their own
  // (heavier) endpoint so the table filters stay fast.
  const { facets } = useMedicineFacets();
  const { ingredients: ingredientOptions } = useMedicineIngredientOptions();

  const onSubmit = async (data: MedicineCreateRequest) => {
    // The Type field shows a friendly label; store the underlying code.
    const payload: MedicineCreateRequest = {
      ...data,
      type: data.type ? typeValue(data.type) : data.type,
    };
    try {
      if (medicine) {
        await updateMedicine(medicine.id, payload);
        toast.success(`Updated ${payload.brandName}.`);
      } else {
        await createMedicine(payload);
        toast.success(`Added ${payload.brandName}.`);
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to save medicine.',
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent
        // Don't autofocus (and select) the first field when the dialog opens.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          'max-h-[90vh] overflow-y-auto sm:max-w-2xl',
          WHITE_SCROLLBAR,
        )}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Edit medicine' : 'New medicine'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update this medicine in the shared catalog.'
                : 'Add a medicine to the shared, platform-wide catalog.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <section className="space-y-3">
              <SectionLabel>Details</SectionLabel>
              <Field label="Brand name" error={errors.brandName?.message}>
                <Input {...register('brandName')} placeholder="Panadol" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type" error={errors.type?.message}>
                  <CreatableCombobox
                    value={watch('type') ?? ''}
                    onChange={(next) =>
                      setValue('type', next, { shouldValidate: true })
                    }
                    // Options are friendly labels (Brand/Generic/…); the value
                    // is converted back to its code on submit.
                    options={(facets?.types ?? []).map(typeLabel)}
                    placeholder="Pick or type…"
                  />
                </Field>
                <Field label="Form" error={errors.form?.message}>
                  <CreatableCombobox
                    value={watch('form') ?? ''}
                    onChange={(next) =>
                      setValue('form', next, { shouldValidate: true })
                    }
                    options={facets?.forms ?? []}
                    placeholder="Pick or type…"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dosage" error={errors.dosage?.message}>
                  <CreatableCombobox
                    value={watch('dosage') ?? ''}
                    onChange={(next) =>
                      setValue('dosage', next, { shouldValidate: true })
                    }
                    options={facets?.dosages ?? []}
                    placeholder="Pick or type…"
                  />
                </Field>
                <Field label="Price" error={errors.priceLbp?.message}>
                  {/* Text input (not number) so there are no spinner arrows. */}
                  <div className="relative">
                    <Input
                      {...register('priceLbp')}
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      className="pr-14"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-medium text-gray-400">
                      LBP
                    </span>
                  </div>
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <SectionLabel>Catalog codes</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="MOPH ID" error={errors.mophId?.message}>
                  <Input {...register('mophId')} placeholder="Optional" />
                </Field>
                <Field label="ATC code" error={errors.atcCode?.message}>
                  <Input {...register('atcCode')} placeholder="Optional" />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <SectionLabel>Barcode</SectionLabel>
              <BarcodeScanField
                value={barcode}
                onChange={(next) =>
                  setValue('barcode', next, { shouldValidate: true })
                }
              />
              {errors.barcode?.message ? (
                <p className="text-xs text-error">{errors.barcode.message}</p>
              ) : null}
            </section>

            <section className="space-y-3">
              <SectionLabel>Ingredients</SectionLabel>
              <MultiCombobox
                value={watch('ingredients') ?? []}
                onChange={(next) =>
                  setValue('ingredients', next, { shouldValidate: true })
                }
                options={ingredientOptions ?? []}
                placeholder="Add ingredients — pick existing or type…"
              />
              {errors.ingredients?.message ? (
                <p className="text-xs text-error">
                  {errors.ingredients.message}
                </p>
              ) : null}
            </section>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Add medicine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// View (read-only) dialog — opened by clicking a row

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">
        {children}
      </span>
    </div>
  );
}

function ViewMedicineDialog({
  medicine,
  onClose,
  onEdit,
}: {
  medicine: MedicineResponse;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn('max-h-[90vh] overflow-y-auto', WHITE_SCROLLBAR)}
      >
        <DialogHeader>
          <DialogTitle>Medicine details</DialogTitle>
          <DialogDescription>
            Read-only overview of this catalog entry.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
          <MedicineIcon />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">
              {medicine.brandName}
            </p>
            <p className="truncate text-sm text-gray-500">
              {medicine.type ? typeLabel(medicine.type) : 'Uncategorized'}
            </p>
          </div>
        </div>

        <div className="px-1">
          <DetailRow label="Form">{medicine.form ?? '—'}</DetailRow>
          <DetailRow label="Dosage">{medicine.dosage ?? '—'}</DetailRow>
          <DetailRow label="Price">{formatPrice(medicine.priceLbp)}</DetailRow>
          <DetailRow label="Barcode">
            {medicine.barcode ? (
              <span className="font-mono">{medicine.barcode}</span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="MOPH ID">
            {medicine.mophId ? (
              <span className="font-mono">{medicine.mophId}</span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="ATC code">
            {medicine.atcCode ? (
              <span className="font-mono">{medicine.atcCode}</span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="Ingredients">
            <span className="font-normal text-gray-700">
              {medicine.ingredients.length > 0
                ? medicine.ingredients.join(', ')
                : '—'}
            </span>
          </DetailRow>
          <DetailRow label="Added">{formatDate(medicine.createdAt)}</DetailRow>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMedicineDialog({
  medicine,
  onClose,
}: {
  medicine: MedicineResponse;
  onClose: () => void;
}) {
  const { deleteMedicine } = useMedicineActions();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMedicine(medicine.id);
      toast.success(`Deleted ${medicine.brandName}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to delete medicine.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete medicine</DialogTitle>
          <DialogDescription>
            This permanently deletes {medicine.brandName} and cascades to any
            stock batches, inquiries, and ingredient links that reference it.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete medicine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

type DialogState =
  | { mode: 'create' }
  | { mode: 'view'; medicine: MedicineResponse }
  | { mode: 'edit'; medicine: MedicineResponse }
  | { mode: 'delete'; medicine: MedicineResponse }
  | null;

function MedicineRow({
  medicine,
  onView,
  onEdit,
  onDelete,
}: {
  medicine: MedicineResponse;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <TableRow
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onView();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${medicine.brandName}`}
      className="cursor-pointer"
    >
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-3">
          <MedicineIcon />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">
              {medicine.brandName}
            </p>
            <p className="truncate text-sm text-gray-500">
              {medicine.ingredients.length > 0
                ? medicine.ingredients.join(', ')
                : 'No ingredients listed'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="truncate">
        {medicine.type ? <TypePill type={medicine.type} /> : '—'}
      </TableCell>
      <TableCell className="truncate text-gray-600">
        {medicine.form ?? '—'}
      </TableCell>
      <TableCell className="truncate text-gray-600">
        {medicine.dosage ?? '—'}
      </TableCell>
      <TableCell className="text-right font-medium text-gray-900">
        {formatPrice(medicine.priceLbp)}
      </TableCell>
      <TableCell onClick={stop} className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            title="Edit medicine"
            aria-label={`Edit ${medicine.brandName}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            title="Delete medicine"
            aria-label={`Delete ${medicine.brandName}`}
            className="text-error hover:bg-error/10 hover:text-error-dark"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function MedicinesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<string | undefined>(undefined);
  const [dosage, setDosage] = useState<string | undefined>(undefined);
  // `null` = nothing picked yet (no card highlighted on load); 'all' is only set
  // once the user explicitly clicks the Total card. Both mean "no narrowing".
  const [quick, setQuick] = useState<QuickFilter | null>(null);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [dialog, setDialog] = useState<DialogState>(null);

  // Debounce the search box, and reset to the first page whenever it changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // The shared filter shape sent to both the list and the facets endpoints. The
  // quick cards map onto the price/barcode completeness flags.
  const filters: MedicineFilter = {
    search: search || undefined,
    type,
    form,
    dosage,
    hasPrice:
      quick === 'priced' ? 'true' : quick === 'unpriced' ? 'false' : undefined,
    hasBarcode: quick === 'missingBarcode' ? 'false' : undefined,
  };

  const { medicines, total, isLoading, error, mutate } = useMedicines({
    ...filters,
    page,
    pageSize: PAGE_SIZE,
  });
  const { facets } = useMedicineFacets(filters);
  const { stats, isLoading: statsLoading } = useMedicineStats();

  const totalCount = total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const hasFilters =
    type !== undefined ||
    form !== undefined ||
    dosage !== undefined ||
    (quick !== null && quick !== 'all');

  // Keep the editable page box in sync with the active page.
  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const goToPage = (next: number) =>
    setPage(Math.min(totalPages, Math.max(1, next)));

  // Commit whatever the user typed into the page box (clamped to a valid page).
  const commitPageInput = () => {
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(page));
      return;
    }
    goToPage(Math.floor(parsed));
  };

  // Every filter change resets to the first page so results stay in view.
  const applyType = (value: string | undefined) => {
    setType(value);
    setPage(1);
  };
  const applyForm = (value: string | undefined) => {
    setForm(value);
    // Changing the form may make the chosen dosage impossible — clear it.
    setDosage(undefined);
    setPage(1);
  };
  const applyDosage = (value: string | undefined) => {
    setDosage(value);
    setPage(1);
  };
  const applyQuick = (value: QuickFilter) => {
    // Clicking the active card deselects it (back to nothing highlighted).
    setQuick((current) => (current === value ? null : value));
    setPage(1);
  };
  const clearFilters = () => {
    setType(undefined);
    setForm(undefined);
    setDosage(undefined);
    setQuick(null);
    setPage(1);
  };

  const statValues: Record<QuickFilter, number> = {
    all: stats?.total ?? 0,
    priced: stats?.priced ?? 0,
    unpriced: stats ? Math.max(0, stats.total - stats.priced) : 0,
    missingBarcode: stats ? Math.max(0, stats.total - stats.withBarcode) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the shared, platform-wide medicine catalog — names, forms,
            dosage, pricing, and barcodes.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-12 w-40 shrink-0 justify-center px-6 text-base"
          onClick={() => setDialog({ mode: 'create' })}
        >
          <Plus className="h-5 w-5" />
          New medicine
        </Button>
      </div>

      {/* Summary cards — click to filter the table */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_TILES.map((tile) => {
          const active = quick === tile.key;
          return (
            <Card
              key={tile.key}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => applyQuick(tile.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  applyQuick(tile.key);
                }
              }}
              className={cn(
                'cursor-pointer py-0 transition-shadow hover:shadow-md',
                active && cn('ring-2 ring-offset-1', tile.ringClass),
              )}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    tile.iconClass,
                  )}
                >
                  <tile.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-500">{tile.label}</p>
                  {statsLoading ? (
                    <Skeleton className="mt-1 h-6 w-10" />
                  ) : (
                    <p className="text-xl font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US').format(
                        statValues[tile.key],
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar: search grows to fill; filters sit at the right */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, barcode, or ingredient…"
            className="h-9 w-full pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <FilterCombobox
            allLabel="All types"
            value={type}
            options={withSelected(facets?.types, type)}
            onChange={applyType}
            width="w-44"
            labelFor={typeLabel}
          />
          <FilterCombobox
            allLabel="All forms"
            value={form}
            options={withSelected(facets?.forms, form)}
            onChange={applyForm}
            width="w-44"
          />
          <FilterCombobox
            allLabel="All dosages"
            value={dosage}
            options={withSelected(facets?.dosages, dosage)}
            onChange={applyDosage}
            width="w-44"
          />
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-gray-500"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <Card className="gap-0 overflow-hidden py-0">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load medicines
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching the catalog. Please try again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-9 flex-1" />
              </div>
            ))}
          </div>
        ) : !medicines || medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Pill className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No medicines found
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              {search || hasFilters
                ? 'No medicines match your search and filters.'
                : 'The catalog is empty. Add the first medicine to get started.'}
            </p>
          </div>
        ) : (
          <Table className="table-fixed [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Medicine</TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-32">Form</TableHead>
                <TableHead className="w-32">Dosage</TableHead>
                <TableHead className="w-36 text-right">Price</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((medicine) => (
                <MedicineRow
                  key={medicine.id}
                  medicine={medicine}
                  onView={() => setDialog({ mode: 'view', medicine })}
                  onEdit={() => setDialog({ mode: 'edit', medicine })}
                  onDelete={() => setDialog({ mode: 'delete', medicine })}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {!error && !isLoading && medicines && medicines.length > 0 ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Showing {rangeStart}–{rangeEnd} of{' '}
            {new Intl.NumberFormat('en-US').format(totalCount)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>Page</span>
              <Input
                value={pageInput}
                onChange={(event) =>
                  setPageInput(event.target.value.replace(/[^0-9]/g, ''))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitPageInput();
                  }
                }}
                onBlur={commitPageInput}
                inputMode="numeric"
                aria-label="Go to page"
                className="h-8 w-14 px-2 text-center"
              />
              <span>of {totalPages}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {dialog?.mode === 'create' ? (
        <MedicineFormDialog onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.mode === 'view' ? (
        <ViewMedicineDialog
          key={dialog.medicine.id}
          medicine={dialog.medicine}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ mode: 'edit', medicine: dialog.medicine })}
        />
      ) : null}
      {dialog?.mode === 'edit' ? (
        <MedicineFormDialog
          key={dialog.medicine.id}
          medicine={dialog.medicine}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === 'delete' ? (
        <DeleteMedicineDialog
          key={dialog.medicine.id}
          medicine={dialog.medicine}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

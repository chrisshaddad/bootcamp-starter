'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Search,
  ScanLine,
  Plus,
  Check,
  Pill,
  ArrowLeft,
  Building2,
  RotateCw,
} from 'lucide-react';
import type { StockCatalogItem } from '@repo/contracts';
import {
  searchStockCatalog,
  useStockActions,
  useStockAttributes,
} from '@/hooks/use-stock';
import { ApiError } from '@/lib/api';
import {
  generateBatchNumber,
  medicineSubtitle,
  typeLabel,
  typeValue,
} from '@/lib/stock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreatableCombobox, MultiCombobox } from '@/components/stock/combobox';
import { BarcodeScanField } from '@/components/barcode-scan-field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Batch fields only — medicineId + branchId are supplied by the dialog, not the
// form. The server re-validates the full shape via stockBatchCreateRequestSchema.
const batchFormSchema = z.object({
  batchNumber: z.string().trim().max(100, 'Batch number is too long').optional(),
  quantity: z
    .number('Enter a quantity')
    .int('Whole numbers only')
    .min(0, 'Cannot be negative')
    .max(1_000_000, 'Too large'),
  expiryDate: z.string().min(1, 'Select an expiry date'),
});
type BatchForm = z.infer<typeof batchFormSchema>;

// New-medicine fields for the barcode-not-found path.
const newMedicineSchema = z.object({
  brandName: z.string().trim().min(1, 'Brand name is required').max(200),
  type: z.string().trim().max(20, 'Keep type under 20 characters').optional(),
  form: z.string().trim().max(50, 'Keep form under 50 characters').optional(),
  dosage: z
    .string()
    .trim()
    .max(100, 'Keep dosage under 100 characters')
    .optional(),
  barcode: z.string().trim().max(100, 'Barcode is too long').optional(),
  ingredients: z.array(z.string()),
});
type NewMedicineForm = z.infer<typeof newMedicineSchema>;

function MedicineChip({ medicine }: { medicine: StockCatalogItem }) {
  const subtitle = medicineSubtitle(medicine.form, medicine.dosage);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
        <Pill className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900">
          {medicine.brandName}
        </p>
        <p className="truncate text-xs text-gray-500">
          {[subtitle, medicine.barcode ? `#${medicine.barcode}` : null]
            .filter(Boolean)
            .join('  ·  ') || 'No details'}
        </p>
      </div>
    </div>
  );
}

// Step 1a — free-text catalog search.
function MedicineSearch({
  onSelect,
}: {
  onSelect: (medicine: StockCatalogItem) => void;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<StockCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      // Clear a pending "Searching…" here: a debounce/request started for a
      // longer term is abandoned (active=false) when the term drops below two
      // chars, so its finally can no longer reset loading.
      setLoading(false);
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    const handle = setTimeout(() => {
      searchStockCatalog({ search: query })
        .then((data) => active && setResults(data.medicines))
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [term]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search medicines by name or barcode…"
          className="h-10 pl-9"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
        {loading ? (
          <p className="px-3 py-4 text-center text-sm text-gray-500">
            Searching…
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-gray-500">
            {term.trim().length < 2
              ? 'Type at least 2 characters to search.'
              : 'No medicines match. Try the barcode tab to add a new one.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((medicine) => (
              <li key={medicine.id}>
                <button
                  type="button"
                  onClick={() => onSelect(medicine)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50"
                >
                  <MedicineChip medicine={medicine} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Step 1b — barcode scan/lookup, with a create-new fallback when unknown.
function BarcodeLookup({
  onSelect,
}: {
  onSelect: (medicine: StockCatalogItem) => void;
}) {
  const { createMedicine } = useStockActions();
  const { attributes } = useStockAttributes();
  const [barcode, setBarcode] = useState('');
  const [looking, setLooking] = useState(false);
  // null = not looked up yet; false = looked up, nothing found (offer create).
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);
  // Sequence id so an out-of-order/stale barcode response can't select a
  // medicine for a barcode the user has since changed. Only the latest lookup
  // may apply its result or clear the loading state.
  const lookupSeq = useRef(0);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewMedicineForm>({
    resolver: zodResolver(newMedicineSchema),
    defaultValues: {
      brandName: '',
      type: '',
      form: '',
      dosage: '',
      barcode: '',
      ingredients: [],
    },
  });

  async function lookup() {
    const code = barcode.trim();
    if (!code) return;
    const requestId = ++lookupSeq.current;
    setLooking(true);
    setNotFound(false);
    try {
      const { medicines } = await searchStockCatalog({ barcode: code });
      // A newer lookup superseded this one — discard its result so we never
      // select a medicine for a barcode that's no longer shown.
      if (requestId !== lookupSeq.current) return;
      if (medicines[0]) {
        onSelect(medicines[0]);
      } else {
        setNotFound(true);
        reset({
          brandName: '',
          type: '',
          form: '',
          dosage: '',
          barcode: code,
          ingredients: [],
        });
      }
    } catch {
      if (requestId !== lookupSeq.current) return;
      toast.error('Barcode lookup failed.');
    } finally {
      // Only the latest lookup owns the loading state; a stale one clearing it
      // would hide a newer request still in flight.
      if (requestId === lookupSeq.current) setLooking(false);
    }
  }

  async function onCreate(data: NewMedicineForm) {
    try {
      const medicine = await createMedicine({
        brandName: data.brandName,
        mophId: null,
        atcCode: null,
        type: data.type ? typeValue(data.type) : null,
        dosage: data.dosage || null,
        form: data.form || null,
        ingredients: data.ingredients,
        barcode: data.barcode || null,
        priceLbp: null,
      });
      toast.success(`Added ${medicine.brandName} to the catalog.`);
      onSelect(medicine);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to create medicine.',
      );
    }
  }

  if (creating || notFound) {
    return (
      <form onSubmit={handleSubmit(onCreate)} className="space-y-3">
        <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-dark">
          No medicine found for this barcode — add it to the catalog.
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Brand name
          </label>
          <Input {...register('brandName')} placeholder="e.g. Panadol" />
          {errors.brandName ? (
            <p className="text-xs text-error">{errors.brandName.message}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Dosage</label>
            <CreatableCombobox
              value={watch('dosage') ?? ''}
              onChange={(next) =>
                setValue('dosage', next, { shouldValidate: true })
              }
              options={attributes?.dosages ?? []}
              placeholder="Pick or type…"
            />
            {errors.dosage ? (
              <p className="text-xs text-error">{errors.dosage.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Form</label>
            <CreatableCombobox
              value={watch('form') ?? ''}
              onChange={(next) =>
                setValue('form', next, { shouldValidate: true })
              }
              options={attributes?.forms ?? []}
              placeholder="Pick or type…"
            />
            {errors.form ? (
              <p className="text-xs text-error">{errors.form.message}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Type</label>
          <CreatableCombobox
            value={watch('type') ?? ''}
            onChange={(next) =>
              setValue('type', next, { shouldValidate: true })
            }
            // Options are friendly labels (Brand/Generic/…); the value is
            // converted back to its stored code (B/G) on submit. Dedupe so two
            // raw codes can't map to the same label (duplicate list keys).
            options={[...new Set((attributes?.types ?? []).map(typeLabel))]}
            placeholder="Pick or type…"
          />
          {errors.type ? (
            <p className="text-xs text-error">{errors.type.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Ingredients
          </label>
          <MultiCombobox
            value={watch('ingredients') ?? []}
            onChange={(next) =>
              setValue('ingredients', next, { shouldValidate: true })
            }
            options={attributes?.ingredients ?? []}
            placeholder="Add ingredients — pick existing or type…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Barcode</label>
          <BarcodeScanField
            value={watch('barcode') ?? ''}
            onChange={(next) =>
              setValue('barcode', next, { shouldValidate: true })
            }
          />
          {errors.barcode ? (
            <p className="text-xs text-error">{errors.barcode.message}</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add medicine & continue'}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            autoFocus
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void lookup();
              }
            }}
            placeholder="Scan or type a barcode…"
            className="h-10 pl-9"
          />
        </div>
        <Button type="button" onClick={() => void lookup()} disabled={looking}>
          {looking ? 'Looking…' : 'Look up'}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="text-sm text-primary-hover hover:underline"
      >
        Or add a new medicine manually
      </button>
    </div>
  );
}

export function AddBatchDialog({
  branchId,
  branchName,
  presetMedicine,
  onClose,
  onAdded,
}: {
  branchId: string | undefined;
  branchName?: string | null;
  presetMedicine?: StockCatalogItem;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { createBatch } = useStockActions();
  const [tab, setTab] = useState<'search' | 'barcode'>('search');
  const [selected, setSelected] = useState<StockCatalogItem | null>(
    presetMedicine ?? null,
  );
  // Prefill a batch number in the seeded "BATCH-XXXXXXXX" shape (generated once
  // per open). It stays fully editable — regenerate or overwrite with a lot.
  const [initialBatchNumber] = useState(generateBatchNumber);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BatchForm>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      batchNumber: initialBatchNumber,
      quantity: 0,
      expiryDate: '',
    },
  });

  async function onSubmit(data: BatchForm) {
    if (!selected) return;
    try {
      await createBatch({
        branchId,
        medicineId: selected.id,
        batchNumber: data.batchNumber || null,
        quantity: data.quantity,
        expiryDate: data.expiryDate,
      });
      toast.success(`Batch added to ${selected.brandName}.`);
      onAdded?.();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to add batch.',
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent
        // The medicine picker and the "create new medicine" form differ a lot in
        // height; cap at the viewport and scroll so the taller form never spills
        // off-screen (mirrors the super-admin medicines dialog).
        className="max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-white hover:[&::-webkit-scrollbar-thumb]:bg-gray-300"
      >
        <DialogHeader>
          <DialogTitle>Add stock batch</DialogTitle>
          <DialogDescription>
            {selected
              ? 'Enter the batch quantity and expiry.'
              : 'Find the medicine by name, or scan its barcode.'}
          </DialogDescription>
          {branchName ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
              Adding to
              <span className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 font-semibold text-primary-hover">
                <Building2 className="h-3.5 w-3.5" />
                {branchName}
              </span>
            </div>
          ) : null}
        </DialogHeader>

        <div className="py-4">
          {!selected ? (
            <div className="space-y-4">
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {(['search', 'barcode'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                      tab === value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {value === 'search' ? 'Search' : 'Scan barcode'}
                  </button>
                ))}
              </div>
              {tab === 'search' ? (
                <MedicineSearch onSelect={setSelected} />
              ) : (
                <BarcodeLookup onSelect={setSelected} />
              )}
            </div>
          ) : (
            <form
              id="add-batch-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <MedicineChip medicine={selected} />
                {!presetMedicine ? (
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="flex shrink-0 items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change
                  </button>
                ) : (
                  <Check className="h-4 w-4 shrink-0 text-success" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min={0}
                    {...register('quantity', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.quantity ? (
                    <p className="text-xs text-error">
                      {errors.quantity.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Expiry date
                  </label>
                  <Input
                    type="date"
                    {...register('expiryDate')}
                    className="accent-success scheme-light"
                  />
                  {errors.expiryDate ? (
                    <p className="text-xs text-error">
                      {errors.expiryDate.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Batch number{' '}
                    <span className="font-normal text-gray-400">
                      (auto-filled, editable)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setValue('batchNumber', generateBatchNumber(), {
                        shouldValidate: true,
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-hover hover:underline"
                  >
                    <RotateCw className="h-3 w-3" />
                    Regenerate
                  </button>
                </div>
                <Input
                  {...register('batchNumber')}
                  placeholder="e.g. BATCH-4K2P9XQ1"
                />
                {errors.batchNumber ? (
                  <p className="text-xs text-error">
                    {errors.batchNumber.message}
                  </p>
                ) : null}
              </div>
            </form>
          )}
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
          <Button
            type="submit"
            form="add-batch-form"
            disabled={!selected || isSubmitting || !branchId}
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Adding…' : 'Add batch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

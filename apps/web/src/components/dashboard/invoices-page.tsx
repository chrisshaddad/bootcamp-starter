'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  FileTextIcon,
  EyeIcon,
  PlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  RefreshCwIcon,
  WalletIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  useListInvoicesQuery,
  useCreateInvoiceMutation,
  useRunRecurringInvoicesMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} from '@/store/api/endpoints/invoices.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import { useListFloorsQuery } from '@/store/api/endpoints/floors.api';
import { useListApartmentsQuery } from '@/store/api/endpoints/apartments.api';
import { useListLeasesQuery } from '@/store/api/endpoints/leases.api';
import { useListRentersQuery } from '@/store/api/endpoints/renters.api';
import type {
  InvoiceLineItemCategory,
  InvoiceResponse,
  InvoiceStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUSES: InvoiceStatus[] = ['open', 'partially_paid', 'paid', 'overdue'];

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

function StatusBadge({
  status,
  labels,
}: {
  status: InvoiceStatus;
  labels: Dictionary['invoices']['status'];
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {labels[status] ?? status}
    </Badge>
  );
}

// ── Line item categories ────────────────────────────────────────────────────

const LINE_ITEM_CATEGORIES: InvoiceLineItemCategory[] = [
  'rent',
  'late_fee',
  'utilities',
  'damages',
  'deposit',
  'other',
];

// ── Form schema ──────────────────────────────────────────────────────────────

const NONE = '__none__';

function buildInvoiceSchema(
  errors: Dictionary['invoices']['list']['form']['errors'],
) {
  const lineItemSchema = z.object({
    category: z.enum([
      'rent',
      'late_fee',
      'utilities',
      'damages',
      'deposit',
      'other',
    ]),
    description: z.string().optional(),
    amount: z
      .string()
      .min(1, errors.amountRequired)
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
        errors.amountPositive,
      ),
  });

  return z.object({
    leaseId: z.string().min(1, errors.leaseRequired),
    dueDate: z.string().min(1, errors.dueDateRequired),
    notes: z.string().optional(),
    lineItems: z.array(lineItemSchema).min(1, errors.lineItemsRequired),
  });
}

type InvoiceFormValues = z.infer<ReturnType<typeof buildInvoiceSchema>>;

const EMPTY_LINE_ITEM = {
  category: 'rent' as const,
  description: '',
  amount: '',
};

const EMPTY_VALUES: InvoiceFormValues = {
  leaseId: '',
  dueDate: '',
  notes: '',
  lineItems: [EMPTY_LINE_ITEM],
};

// ── Line items sub-form (create + edit dialogs) ───────────────────────────────

function LineItemsFields({
  idPrefix,
  control,
  register,
  errors,
  categoryLabels,
  t,
}: {
  idPrefix: string;
  control: ReturnType<typeof useForm<InvoiceFormValues>>['control'];
  register: ReturnType<typeof useForm<InvoiceFormValues>>['register'];
  errors: ReturnType<typeof useForm<InvoiceFormValues>>['formState']['errors'];
  categoryLabels: Dictionary['invoices']['lineItemCategory'];
  t: Dictionary['invoices']['list']['form']['lineItems'];
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>
          {t.label} <span className="text-destructive">*</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(EMPTY_LINE_ITEM)}
        >
          <PlusIcon className="size-3.5" />
          {t.addRow}
        </Button>
      </div>
      {errors.lineItems?.root && (
        <p className="text-xs text-destructive">
          {errors.lineItems.root.message}
        </p>
      )}
      {errors.lineItems?.message && (
        <p className="text-xs text-destructive">{errors.lineItems.message}</p>
      )}
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start gap-2 rounded-lg border p-2.5"
          >
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1">
                <Controller
                  control={control}
                  name={`lineItems.${index}.category`}
                  render={({ field: catField }) => (
                    <Select
                      value={catField.value}
                      onValueChange={catField.onChange}
                    >
                      <SelectTrigger
                        id={`${idPrefix}-li-${index}-category`}
                        aria-label={t.categoryAriaLabel.replace(
                          '{n}',
                          String(index + 1),
                        )}
                        className="w-full"
                      >
                        <SelectValue>
                          {(value: string | null) =>
                            !value
                              ? t.categoryPlaceholder
                              : (categoryLabels[
                                  value as InvoiceLineItemCategory
                                ] ?? value)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_ITEM_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {categoryLabels[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Input
                  placeholder={t.descriptionPlaceholder}
                  aria-label={t.descriptionAriaLabel.replace(
                    '{n}',
                    String(index + 1),
                  )}
                  {...register(`lineItems.${index}.description`)}
                />
              </div>
              <div className="flex w-full flex-col gap-1 sm:w-28">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t.amountPlaceholder}
                  aria-label={t.amountAriaLabel.replace(
                    '{n}',
                    String(index + 1),
                  )}
                  aria-invalid={!!errors.lineItems?.[index]?.amount}
                  {...register(`lineItems.${index}.amount`)}
                />
                {errors.lineItems?.[index]?.amount && (
                  <p className="text-xs text-destructive">
                    {errors.lineItems[index]?.amount?.message}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.removeAriaLabel}
              disabled={fields.length === 1}
              onClick={() => remove(index)}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lease picker (create dialog only — lease is fixed once created) ──────────

function LeasePicker({
  value,
  onChange,
  error,
  t,
}: {
  value: string;
  onChange: (leaseId: string) => void;
  error?: string;
  t: Dictionary['invoices']['list']['form']['leasePicker'];
}) {
  const { data: buildings } = useListBuildingsQuery();
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [apartmentId, setApartmentId] = useState('');

  const { data: floors } = useListFloorsQuery(buildingId, {
    skip: !buildingId,
  });
  const { data: apartments } = useListApartmentsQuery(
    { buildingId, floorId },
    { skip: !floorId },
  );
  const { data: leases } = useListLeasesQuery(
    { buildingId, floorId, apartmentId },
    { skip: !apartmentId },
  );
  const { data: renters } = useListRentersQuery();

  const renterNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of renters ?? []) map.set(r.id, r.fullName);
    return map;
  }, [renters]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t.building}</Label>
          <Select
            value={buildingId || NONE}
            onValueChange={(v) => {
              const next = v === NONE ? '' : (v ?? '');
              setBuildingId(next);
              setFloorId('');
              setApartmentId('');
              onChange('');
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === NONE
                    ? t.selectBuilding
                    : (buildings?.find((b) => b.id === value)?.name ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t.selectBuilding}</SelectItem>
              {buildings?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t.floor}</Label>
          <Select
            value={floorId || NONE}
            onValueChange={(v) => {
              const next = v === NONE ? '' : (v ?? '');
              setFloorId(next);
              setApartmentId('');
              onChange('');
            }}
            disabled={!buildingId}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === NONE
                    ? t.selectFloor
                    : (floors?.find((f) => f.id === value)?.name ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t.selectFloor}</SelectItem>
              {floors?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t.apartment}</Label>
          <Select
            value={apartmentId || NONE}
            onValueChange={(v) => {
              const next = v === NONE ? '' : (v ?? '');
              setApartmentId(next);
              onChange('');
            }}
            disabled={!floorId}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === NONE
                    ? t.selectApartment
                    : (apartments?.find((a) => a.id === value)?.unitNumber ??
                      value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t.selectApartment}</SelectItem>
              {apartments?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.unitNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>
          {t.lease} <span className="text-destructive">*</span>
        </Label>
        <Select
          value={value || NONE}
          onValueChange={(v) => onChange(v === NONE ? '' : (v ?? ''))}
          disabled={!apartmentId}
        >
          <SelectTrigger className="w-full" aria-invalid={!!error}>
            <SelectValue>
              {(leaseId: string | null) => {
                if (!leaseId || leaseId === NONE) return t.selectLease;
                const lease = leases?.find((l) => l.id === leaseId);
                if (!lease) return leaseId;
                return `${renterNameById.get(lease.renterId) ?? lease.renterId} · ${lease.effectiveStatus}`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t.selectLease}</SelectItem>
            {leases?.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {renterNameById.get(l.renterId) ?? l.renterId} ·{' '}
                {l.effectiveStatus}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const ALL = '__all__';

interface InvoicesPageProps {
  /** When false (supervisor), hide all write actions. */
  canWrite: boolean;
  locale: string;
  dict: Dictionary;
}

export function InvoicesPage({ canWrite, locale, dict }: InvoicesPageProps) {
  const t = dict.invoices;
  const router = useRouter();
  const { data: invoices, isLoading, isError } = useListInvoicesQuery();
  const { data: buildings } = useListBuildingsQuery();

  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [runRecurring, { isLoading: generating }] =
    useRunRecurringInvoicesMutation();

  async function handleGenerateRecurring() {
    try {
      const res = await runRecurring().unwrap();
      toast.success(
        t.list.generateRecurring.result
          .replace('{generated}', String(res.generated))
          .replace('{skipped}', String(res.skippedExisting)),
      );
    } catch {
      toast.error(t.list.generateRecurring.error);
    }
  }
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation();
  const [deleteInvoice, { isLoading: deleting }] = useDeleteInvoiceMutation();

  const [buildingFilter, setBuildingFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InvoiceResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceResponse | null>(
    null,
  );

  const schema = useMemo(
    () => buildInvoiceSchema(t.list.form.errors),
    [t.list.form.errors],
  );

  const {
    control: createControl,
    register: registerCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  const {
    control: editControl,
    register: registerEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  const buildingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of buildings ?? []) map.set(b.id, b.name);
    return map;
  }, [buildings]);

  const filteredInvoices = useMemo(() => {
    return (invoices ?? []).filter((invoice) => {
      if (buildingFilter !== ALL && invoice.buildingId !== buildingFilter) {
        return false;
      }
      if (statusFilter !== ALL && invoice.status !== statusFilter) {
        return false;
      }
      const dueDate = invoice.dueDate.slice(0, 10);
      if (fromDate && dueDate < fromDate) return false;
      if (toDate && dueDate > toDate) return false;
      return true;
    });
  }, [invoices, buildingFilter, statusFilter, fromDate, toDate]);

  const hasAnyInvoices = (invoices?.length ?? 0) > 0;

  function goToInvoice(invoiceId: string) {
    router.push(`/${locale}/dashboard/invoices/${invoiceId}`);
  }

  async function onCreateSubmit(values: InvoiceFormValues) {
    try {
      await createInvoice({
        leaseId: values.leaseId,
        dueDate: values.dueDate,
        notes: values.notes || undefined,
        lineItems: values.lineItems.map((li) => ({
          category: li.category,
          description: li.description || undefined,
          amount: Number(li.amount),
        })),
      }).unwrap();
      toast.success(t.list.dialog.create.success);
      setCreateOpen(false);
      resetCreate(EMPTY_VALUES);
    } catch {
      toast.error(t.list.dialog.create.error);
    }
  }

  function openEdit(invoice: InvoiceResponse) {
    setEditTarget(invoice);
    resetEdit({
      leaseId: invoice.leaseId,
      dueDate: invoice.dueDate.slice(0, 10),
      notes: invoice.notes ?? '',
      lineItems: invoice.lineItems.map((li) => ({
        category: li.category,
        description: li.description ?? '',
        amount: li.amount,
      })),
    });
  }

  async function onEditSubmit(values: InvoiceFormValues) {
    if (!editTarget) return;
    try {
      await updateInvoice({
        id: editTarget.id,
        body: {
          dueDate: values.dueDate,
          notes: values.notes || null,
          lineItems: values.lineItems.map((li) => ({
            category: li.category,
            description: li.description || undefined,
            amount: Number(li.amount),
          })),
        },
      }).unwrap();
      toast.success(t.list.dialog.edit.success);
      setEditTarget(null);
    } catch {
      toast.error(t.list.dialog.edit.error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInvoice(deleteTarget.id).unwrap();
      toast.success(t.list.dialog.delete.success);
      setDeleteTarget(null);
    } catch {
      toast.error(t.list.dialog.delete.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.list.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.list.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              {t.list.readOnly}
            </Badge>
          )}
          {canWrite && (
            <Button
              variant="outline"
              onClick={handleGenerateRecurring}
              disabled={generating}
              title={t.list.generateRecurring.hint}
            >
              <RefreshCwIcon />
              {t.list.generateRecurring.button}
            </Button>
          )}
          {canWrite && (
            <Button
              onClick={() => {
                resetCreate(EMPTY_VALUES);
                setCreateOpen(true);
              }}
            >
              <PlusIcon />
              {t.list.newInvoice}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {hasAnyInvoices && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-building">
              {t.list.filters.buildingLabel}
            </Label>
            <Select
              value={buildingFilter}
              onValueChange={(val) => setBuildingFilter(val ?? ALL)}
            >
              <SelectTrigger id="invoices-filter-building" className="w-44">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.list.filters.allBuildings
                      : (buildingNameById.get(value) ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t.list.filters.allBuildings}
                </SelectItem>
                {(buildings ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-status">
              {t.list.filters.statusLabel}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? ALL)}
            >
              <SelectTrigger id="invoices-filter-status" className="w-44">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.list.filters.allStatuses
                      : (t.status[value as InvoiceStatus] ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t.list.filters.allStatuses}
                </SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t.status[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-from">
              {t.list.filters.dueFromLabel}
            </Label>
            <Input
              id="invoices-filter-from"
              type="date"
              className="w-40"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-to">
              {t.list.filters.dueToLabel}
            </Label>
            <Input
              id="invoices-filter-to"
              type="date"
              className="w-40"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Invoices table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.list.table.leaseRenter}</TableHead>
              <TableHead>{t.list.table.building}</TableHead>
              <TableHead>{t.list.table.dueDate}</TableHead>
              <TableHead>{t.list.table.total}</TableHead>
              <TableHead>{t.list.table.paid}</TableHead>
              <TableHead>{t.list.table.status}</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.list.loadError}
                </TableCell>
              </TableRow>
            ) : !hasAnyInvoices ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <FileTextIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite ? t.list.emptyWrite : t.list.empty}
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.list.noMatch}
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToInvoice(invoice.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToInvoice(invoice.id);
                    }
                  }}
                >
                  <TableCell className="text-sm font-medium">
                    {invoice.renterName} · {invoice.apartmentUnitNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {buildingNameById.get(invoice.buildingId) ??
                      invoice.buildingId}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {invoice.totalAmount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invoice.paidAmount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} labels={t.status} />
                  </TableCell>
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t.list.actionsLabel}
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => goToInvoice(invoice.id)}
                          >
                            <EyeIcon className="size-3.5 mr-1.5" />
                            {t.list.view}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(invoice)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          {invoice.status !== 'paid' && (
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/${locale}/dashboard/rent-payments?recordFor=${encodeURIComponent(invoice.id)}`,
                                )
                              }
                            >
                              <WalletIcon className="size-3.5 mr-1.5" />
                              {t.list.recordPayment}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(invoice)}
                          >
                            <TrashIcon className="size-3.5 mr-1.5" />
                            {dict.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create Invoice Dialog ───────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.list.dialog.create.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <Controller
              control={createControl}
              name="leaseId"
              render={({ field }) => (
                <LeasePicker
                  value={field.value}
                  onChange={field.onChange}
                  error={createErrors.leaseId?.message}
                  t={t.list.form.leasePicker}
                />
              )}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-dueDate">
                {t.list.form.dueDate}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ci-dueDate"
                type="date"
                aria-invalid={!!createErrors.dueDate}
                {...registerCreate('dueDate')}
              />
              {createErrors.dueDate && (
                <p className="text-xs text-destructive">
                  {createErrors.dueDate.message}
                </p>
              )}
            </div>
            <LineItemsFields
              idPrefix="ci"
              control={createControl}
              register={registerCreate}
              errors={createErrors}
              categoryLabels={t.lineItemCategory}
              t={t.list.form.lineItems}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-notes">
                {t.list.form.notes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.list.form.optional}
                </span>
              </Label>
              <Textarea
                id="ci-notes"
                placeholder={t.list.form.notesPlaceholder}
                rows={2}
                {...registerCreate('notes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(EMPTY_VALUES);
                }}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating
                  ? t.list.dialog.create.submitting
                  : t.list.dialog.create.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Invoice Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.list.dialog.edit.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
              <Label className="text-muted-foreground">
                {t.list.dialog.edit.leaseLabel}
              </Label>
              <p className="text-sm font-medium">
                {editTarget?.renterName} · {editTarget?.apartmentUnitNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.list.dialog.edit.leaseLockedNote}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ei-dueDate">
                {t.list.form.dueDate}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ei-dueDate"
                type="date"
                aria-invalid={!!editErrors.dueDate}
                {...registerEdit('dueDate')}
              />
              {editErrors.dueDate && (
                <p className="text-xs text-destructive">
                  {editErrors.dueDate.message}
                </p>
              )}
            </div>
            <LineItemsFields
              idPrefix="ei"
              control={editControl}
              register={registerEdit}
              errors={editErrors}
              categoryLabels={t.lineItemCategory}
              t={t.list.form.lineItems}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ei-notes">
                {t.list.form.notes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.list.form.optional}
                </span>
              </Label>
              <Textarea
                id="ei-notes"
                placeholder={t.list.form.notesPlaceholder}
                rows={2}
                {...registerEdit('notes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.list.dialog.edit.submitting : dict.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t.list.dialog.delete.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.list.dialog.delete.confirmPrefix}{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.renterName}
              </span>
              {t.list.dialog.delete.confirmSuffix}
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setDeleteTarget(null)}
            >
              {dict.common.cancel}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t.list.dialog.delete.confirming : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

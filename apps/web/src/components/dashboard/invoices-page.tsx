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

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUSES: InvoiceStatus[] = ['open', 'partially_paid', 'paid', 'overdue'];

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: 'Open',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status] ?? status}
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

const LINE_ITEM_CATEGORY_LABELS: Record<InvoiceLineItemCategory, string> = {
  rent: 'Rent',
  late_fee: 'Late fee',
  utilities: 'Utilities',
  damages: 'Damages',
  deposit: 'Deposit',
  other: 'Other',
};

// ── Form schema ──────────────────────────────────────────────────────────────

const NONE = '__none__';

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
    .min(1, 'Amount is required')
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
      'Amount must be a positive number',
    ),
});

const invoiceSchema = z.object({
  leaseId: z.string().min(1, 'Lease is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

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
}: {
  idPrefix: string;
  control: ReturnType<typeof useForm<InvoiceFormValues>>['control'];
  register: ReturnType<typeof useForm<InvoiceFormValues>>['register'];
  errors: ReturnType<typeof useForm<InvoiceFormValues>>['formState']['errors'];
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>
          Line items <span className="text-destructive">*</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(EMPTY_LINE_ITEM)}
        >
          <PlusIcon className="size-3.5" />
          Add row
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
                        className="w-full"
                      >
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_ITEM_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {LINE_ITEM_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Input
                  placeholder="Description (optional)"
                  {...register(`lineItems.${index}.description`)}
                />
              </div>
              <div className="flex w-full flex-col gap-1 sm:w-28">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
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
              aria-label="Remove line item"
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
}: {
  value: string;
  onChange: (leaseId: string) => void;
  error?: string;
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
          <Label>Building</Label>
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
              <SelectValue placeholder="Select a building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select a building</SelectItem>
              {buildings?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Floor</Label>
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
              <SelectValue placeholder="Select a floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select a floor</SelectItem>
              {floors?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Apartment</Label>
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
              <SelectValue placeholder="Select an apartment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select an apartment</SelectItem>
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
          Lease <span className="text-destructive">*</span>
        </Label>
        <Select
          value={value || NONE}
          onValueChange={(v) => onChange(v === NONE ? '' : (v ?? ''))}
          disabled={!apartmentId}
        >
          <SelectTrigger className="w-full" aria-invalid={!!error}>
            <SelectValue placeholder="Select a lease" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Select a lease</SelectItem>
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
}

export function InvoicesPage({ canWrite, locale }: InvoicesPageProps) {
  const router = useRouter();
  const { data: invoices, isLoading, isError } = useListInvoicesQuery();
  const { data: buildings } = useListBuildingsQuery();

  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
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

  const {
    control: createControl,
    register: registerCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: EMPTY_VALUES,
  });

  const {
    control: editControl,
    register: registerEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
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
      toast.success('Invoice created.');
      setCreateOpen(false);
      resetCreate(EMPTY_VALUES);
    } catch {
      toast.error('Failed to create invoice. Please try again.');
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
      toast.success('Invoice updated.');
      setEditTarget(null);
    } catch {
      toast.error('Failed to update invoice.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteInvoice(deleteTarget.id).unwrap();
      toast.success('Invoice deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete invoice. Please try again.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bills issued to renters — rent, late fees, utilities, and more.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              Read-only
            </Badge>
          )}
          {canWrite && (
            <Button
              onClick={() => {
                resetCreate(EMPTY_VALUES);
                setCreateOpen(true);
              }}
            >
              <PlusIcon />
              New invoice
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {hasAnyInvoices && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-building">Building</Label>
            <Select
              value={buildingFilter}
              onValueChange={(val) => setBuildingFilter(val ?? ALL)}
            >
              <SelectTrigger id="invoices-filter-building" className="w-44">
                <SelectValue placeholder="All buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All buildings</SelectItem>
                {(buildings ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-status">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? ALL)}
            >
              <SelectTrigger id="invoices-filter-status" className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-from">Due from</Label>
            <Input
              id="invoices-filter-from"
              type="date"
              className="w-40"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-to">Due to</Label>
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
              <TableHead>Lease / Renter</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
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
                  Failed to load invoices. Please try again.
                </TableCell>
              </TableRow>
            ) : !hasAnyInvoices ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <FileTextIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite
                    ? 'No invoices recorded yet. Create your first invoice.'
                    : 'No invoices recorded yet.'}
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No invoices match the selected filters.
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
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Invoice actions"
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
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(invoice)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(invoice)}
                          >
                            <TrashIcon className="size-3.5 mr-1.5" />
                            Delete
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
            <DialogTitle>New invoice</DialogTitle>
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
                />
              )}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-dueDate">
                Due date <span className="text-destructive">*</span>
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
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="ci-notes"
                placeholder="Any notes…"
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
                Cancel
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
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
            <DialogTitle>Edit invoice</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
              <Label className="text-muted-foreground">Lease</Label>
              <p className="text-sm font-medium">
                {editTarget?.renterName} · {editTarget?.apartmentUnitNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                The lease on an invoice can&apos;t be changed after creation.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ei-dueDate">
                Due date <span className="text-destructive">*</span>
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
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ei-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="ei-notes"
                placeholder="Any notes…"
                rows={2}
                {...registerEdit('notes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? 'Saving…' : 'Save'}
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
            <DialogTitle>Delete invoice</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the invoice for{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.renterName}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

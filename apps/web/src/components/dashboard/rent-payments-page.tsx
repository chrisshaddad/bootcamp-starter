'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  BanknoteIcon,
  CalendarClockIcon,
  EyeIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
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
import { KpiTile, useMoney } from '@/components/dashboard/kpi-tile';

import {
  useListRentPaymentsQuery,
  useGetRentPaymentSummaryQuery,
  useCreateInvoicePaymentMutation,
  useDeleteInvoicePaymentMutation,
} from '@/store/api/endpoints/invoice-payments.api';
import { useListInvoicesQuery } from '@/store/api/endpoints/invoices.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import type {
  InvoicePaymentListItem,
  InvoicePaymentMethod,
  InvoiceResponse,
  InvoiceStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Constants ────────────────────────────────────────────────────────────────

const ALL = '__all__';
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const PAYMENT_METHODS: InvoicePaymentMethod[] = [
  'cash',
  'check',
  'bank_transfer',
  'card',
  'other',
];

/** Mirrors invoices-page.tsx / invoice-detail-page.tsx. */
const STATUS_STYLES: Record<InvoiceStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

// ── Record-payment form ──────────────────────────────────────────────────────

type RecordErrors = Dictionary['rentPayments']['dialog']['record']['errors'];

function buildPaymentSchema(errors: RecordErrors) {
  return z.object({
    invoiceId: z.string().min(1, errors.invoiceRequired),
    amount: z
      .string()
      .min(1, errors.amountRequired)
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
        errors.amountPositive,
      ),
    method: z.enum(['cash', 'check', 'bank_transfer', 'card', 'other']),
    paidAt: z.string().min(1, errors.paidAtRequired),
    notes: z.string().optional(),
  });
}

type PaymentFormValues = z.infer<ReturnType<typeof buildPaymentSchema>>;

/** Today in `yyyy-MM-dd` — the natural default for "when was this paid". */
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyPayment(): PaymentFormValues {
  return {
    invoiceId: '',
    amount: '',
    method: 'cash',
    paidAt: todayInputValue(),
    notes: '',
  };
}

function invoiceBalance(invoice: InvoiceResponse): number {
  return Number(invoice.totalAmount) - Number(invoice.paidAmount);
}

// ── Main component ───────────────────────────────────────────────────────────

interface RentPaymentsPageProps {
  locale: string;
  /** org_admin + finance may record/delete; supervisor is read-only. */
  canWrite: boolean;
  dict: Dictionary;
}

export function RentPaymentsPage({
  locale,
  canWrite,
  dict,
}: RentPaymentsPageProps) {
  const t = dict.rentPayments;
  const money = useMoney(locale);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [locale],
  );
  const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

  /** Picks the singular copy for a count of exactly 1 (no ICU in these dicts). */
  const countHint = (count: number, plural: string, one: string) =>
    (count === 1 ? one : plural).replace('{count}', String(count));

  // ── Filters ───────────────────────────────────────────────────────────────
  const [buildingFilter, setBuildingFilter] = useState(ALL);
  const [methodFilter, setMethodFilter] = useState(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the free-text box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      ...(buildingFilter !== ALL && { buildingId: buildingFilter }),
      ...(methodFilter !== ALL && {
        method: methodFilter as InvoicePaymentMethod,
      }),
      ...(fromDate && { from: fromDate }),
      ...(toDate && { to: toDate }),
      ...(search && { q: search }),
    }),
    [buildingFilter, methodFilter, fromDate, toDate, search],
  );

  const hasActiveFilters = Object.keys(filters).length > 0;

  // A narrower result set can leave the current page out of range.
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, isError } = useListRentPaymentsQuery({
    ...filters,
    page,
    limit: PAGE_SIZE,
  });
  const { data: summary, isLoading: summaryLoading } =
    useGetRentPaymentSummaryQuery(filters);
  const { data: buildings } = useListBuildingsQuery();
  // Only needed for the invoice picker in the record dialog.
  const { data: invoices } = useListInvoicesQuery(undefined, {
    skip: !canWrite,
  });

  const [createPayment, { isLoading: creating }] =
    useCreateInvoicePaymentMutation();
  const [deletePayment, { isLoading: deleting }] =
    useDeleteInvoicePaymentMutation();

  const [recordOpen, setRecordOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<InvoicePaymentListItem | null>(null);

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, total);

  /** Invoices with money still owed — the only ones worth paying against. */
  const payableInvoices = useMemo(
    () =>
      (invoices ?? [])
        .filter((invoice) => invoiceBalance(invoice) > 0)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [invoices],
  );

  // ── Record form ───────────────────────────────────────────────────────────
  const schema = useMemo(
    () => buildPaymentSchema(t.dialog.record.errors),
    [t.dialog.record.errors],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyPayment(),
  });

  const selectedInvoiceId = watch('invoiceId');
  const selectedInvoice = payableInvoices.find(
    (invoice) => invoice.id === selectedInvoiceId,
  );
  const selectedBalance = selectedInvoice
    ? invoiceBalance(selectedInvoice)
    : null;

  function invoiceOptionLabel(invoice: InvoiceResponse): string {
    return t.dialog.record.invoiceOption
      .replace('{renter}', invoice.renterName)
      .replace('{unit}', invoice.apartmentUnitNumber)
      .replace('{due}', formatDate(invoice.dueDate));
  }

  async function onRecordSubmit(values: PaymentFormValues) {
    try {
      await createPayment({
        invoiceId: values.invoiceId,
        amount: Number(values.amount),
        method: values.method,
        paidAt: values.paidAt,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success(t.dialog.record.success);
      setRecordOpen(false);
      reset(emptyPayment());
    } catch {
      toast.error(t.dialog.record.error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletePayment({
        id: deleteTarget.id,
        invoiceId: deleteTarget.invoiceId,
      }).unwrap();
      toast.success(t.dialog.delete.success);
      setDeleteTarget(null);
    } catch {
      toast.error(t.dialog.delete.error);
    }
  }

  // ── Deep link: /rent-payments?recordFor=<invoiceId> ──────────────────────
  // Sent by the "Record payment" row action on the invoices list. Opens the
  // dialog with that invoice preselected. Runs once per invoice id (a ref, not
  // state, so closing the dialog doesn't immediately re-open it).
  const handledDeepLink = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const recordFor = searchParams.get('recordFor');

  useEffect(() => {
    if (!canWrite || !recordFor) return;
    if (handledDeepLink.current === recordFor) return;
    // Wait until the invoice list has loaded so the picker can resolve the id.
    if (!payableInvoices.some((invoice) => invoice.id === recordFor)) return;

    handledDeepLink.current = recordFor;
    reset({ ...emptyPayment(), invoiceId: recordFor });
    setRecordOpen(true);
  }, [canWrite, recordFor, payableInvoices, reset]);

  function clearFilters() {
    setBuildingFilter(ALL);
    setMethodFilter(ALL);
    setFromDate('');
    setToDate('');
    setSearchInput('');
  }

  const buildingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of buildings ?? []) map.set(b.id, b.name);
    return map;
  }, [buildings]);

  const columnCount = canWrite ? 9 : 8;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              {t.readOnly}
            </Badge>
          )}
          {canWrite && (
            <Button
              onClick={() => {
                reset(emptyPayment());
                setRecordOpen(true);
              }}
            >
              <PlusIcon />
              {t.recordButton}
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={t.kpi.collected}
          value={money.format(Number(summary?.totalCollected ?? 0))}
          hint={hasActiveFilters ? t.kpi.collectedHint : undefined}
          icon={<WalletIcon className="size-4" />}
          loading={summaryLoading}
        />
        <KpiTile
          label={t.kpi.mtd}
          value={money.format(Number(summary?.mtdCollected ?? 0))}
          hint={countHint(
            summary?.mtdCount ?? 0,
            t.kpi.mtdHint,
            t.kpi.mtdHintOne,
          )}
          icon={<CalendarClockIcon className="size-4" />}
          tone="positive"
          loading={summaryLoading}
        />
        <KpiTile
          label={t.kpi.outstanding}
          value={money.format(Number(summary?.outstandingTotal ?? 0))}
          hint={countHint(
            summary?.outstandingInvoices ?? 0,
            t.kpi.outstandingHint,
            t.kpi.outstandingHintOne,
          )}
          icon={<ReceiptIcon className="size-4" />}
          tone={
            Number(summary?.outstandingTotal ?? 0) > 0 ? 'negative' : 'neutral'
          }
          href={`/${locale}/dashboard/invoices`}
          loading={summaryLoading}
        />
        <KpiTile
          label={t.kpi.byMethod}
          value={
            <span className="text-base font-medium">
              {summary?.byMethod.length
                ? dict.invoices.paymentMethod[summary.byMethod[0].method]
                : '—'}
            </span>
          }
          icon={<BanknoteIcon className="size-4" />}
          loading={summaryLoading}
        >
          <div className="mt-1 flex flex-col gap-0.5">
            {(summary?.byMethod ?? []).slice(0, 3).map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>{dict.invoices.paymentMethod[row.method]}</span>
                <span className="tabular-nums">
                  {money.format(Number(row.amount))}
                </span>
              </div>
            ))}
          </div>
        </KpiTile>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-filter-search">{t.filters.searchLabel}</Label>
          <Input
            id="rp-filter-search"
            className="w-56"
            placeholder={t.filters.searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-filter-building">{t.filters.buildingLabel}</Label>
          <Select
            value={buildingFilter}
            onValueChange={(val) => setBuildingFilter(val ?? ALL)}
          >
            <SelectTrigger id="rp-filter-building" className="w-44">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL
                    ? t.filters.allBuildings
                    : (buildingNameById.get(value) ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.filters.allBuildings}</SelectItem>
              {(buildings ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-filter-method">{t.filters.methodLabel}</Label>
          <Select
            value={methodFilter}
            onValueChange={(val) => setMethodFilter(val ?? ALL)}
          >
            <SelectTrigger id="rp-filter-method" className="w-40">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL
                    ? t.filters.allMethods
                    : (dict.invoices.paymentMethod[
                        value as InvoicePaymentMethod
                      ] ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.filters.allMethods}</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {dict.invoices.paymentMethod[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-filter-from">{t.filters.fromLabel}</Label>
          <Input
            id="rp-filter-from"
            type="date"
            className="w-40"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rp-filter-to">{t.filters.toLabel}</Label>
          <Input
            id="rp-filter-to"
            type="date"
            className="w-40"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            {t.filters.clear}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.table.renter}</TableHead>
              <TableHead>{t.table.unit}</TableHead>
              <TableHead>{t.table.building}</TableHead>
              <TableHead>{t.table.amount}</TableHead>
              <TableHead>{t.table.method}</TableHead>
              <TableHead>{t.table.paidAt}</TableHead>
              <TableHead>{t.table.invoice}</TableHead>
              <TableHead>{t.table.notes}</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(columnCount)].map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t.loadError}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-10 text-center text-muted-foreground"
                >
                  <WalletIcon className="mx-auto mb-2 size-8 opacity-30" />
                  {hasActiveFilters
                    ? t.noMatch
                    : canWrite
                      ? t.emptyWrite
                      : t.empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm font-medium">
                    <Link
                      href={`/${locale}/dashboard/renters/${row.renterId}`}
                      className="hover:underline"
                    >
                      {row.renterName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.apartmentUnitNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Link
                      href={`/${locale}/dashboard/buildings/${row.buildingId}`}
                      className="hover:underline"
                    >
                      {row.buildingName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    {money.format(Number(row.amount))}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dict.invoices.paymentMethod[row.method] ?? row.method}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.paidAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link
                      href={`/${locale}/dashboard/invoices/${row.invoiceId}`}
                      title={t.table.viewInvoice}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Badge
                        variant="outline"
                        className={STATUS_STYLES[row.invoiceStatus]}
                      >
                        {dict.invoices.status[row.invoiceStatus] ??
                          row.invoiceStatus}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {money.format(Number(row.invoicePaidAmount))} /{' '}
                        {money.format(Number(row.invoiceTotalAmount))}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                    {row.notes ?? '—'}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.table.deleteAriaLabel}
                        onClick={() => setDeleteTarget(row)}
                      >
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t.pagination.showing
              .replace('{from}', String(rangeFrom))
              .replace('{to}', String(rangeTo))
              .replace('{total}', String(total))}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t.pagination.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              {t.pagination.next}
            </Button>
          </div>
        </div>
      )}

      {/* ── Record Payment Dialog ─────────────────────────────────────────── */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.record.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onRecordSubmit)}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-muted-foreground">
              {t.dialog.record.description}
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-invoice">
                {t.dialog.record.invoiceLabel}{' '}
                <span className="text-destructive">*</span>
              </Label>
              {payableInvoices.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t.dialog.record.noOpenInvoices}
                </p>
              ) : (
                <Controller
                  control={control}
                  name="invoiceId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => field.onChange(val ?? '')}
                    >
                      <SelectTrigger id="rp-invoice" className="w-full">
                        <SelectValue>
                          {(value: string | null) => {
                            const invoice = payableInvoices.find(
                              (i) => i.id === value,
                            );
                            return invoice
                              ? invoiceOptionLabel(invoice)
                              : t.dialog.record.selectInvoice;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {payableInvoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoiceOptionLabel(invoice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.invoiceId && (
                <p className="text-xs text-destructive">
                  {errors.invoiceId.message}
                </p>
              )}
              {selectedBalance !== null && (
                <p className="text-xs text-muted-foreground">
                  {t.dialog.record.invoiceBalance.replace(
                    '{balance}',
                    money.format(selectedBalance),
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-amount">
                {t.dialog.record.amountLabel}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rp-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={t.dialog.record.amountPlaceholder}
                aria-invalid={!!errors.amount}
                {...register('amount')}
              />
              {selectedBalance !== null && selectedBalance > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit px-1 text-xs"
                  onClick={() =>
                    setValue('amount', selectedBalance.toFixed(2), {
                      shouldValidate: true,
                    })
                  }
                >
                  {t.dialog.record.fillBalance.replace(
                    '{balance}',
                    money.format(selectedBalance),
                  )}
                </Button>
              )}
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-method">
                {t.dialog.record.methodLabel}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rp-method" className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          !value
                            ? t.dialog.record.selectMethod
                            : (dict.invoices.paymentMethod[
                                value as InvoicePaymentMethod
                              ] ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {dict.invoices.paymentMethod[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-paidAt">
                {t.dialog.record.paidAtLabel}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rp-paidAt"
                type="date"
                aria-invalid={!!errors.paidAt}
                {...register('paidAt')}
              />
              {errors.paidAt && (
                <p className="text-xs text-destructive">
                  {errors.paidAt.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-notes">
                {t.dialog.record.notesLabel}{' '}
                <span className="font-normal text-muted-foreground">
                  {t.dialog.record.optional}
                </span>
              </Label>
              <Textarea
                id="rp-notes"
                rows={2}
                placeholder={t.dialog.record.notesPlaceholder}
                {...register('notes')}
              />
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setRecordOpen(false);
                  reset(emptyPayment());
                }}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button
                type="submit"
                disabled={creating || payableInvoices.length === 0}
              >
                {creating ? t.dialog.record.submitting : t.dialog.record.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t.dialog.delete.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.dialog.delete.confirmPrefix}{' '}
              <span className="font-medium text-foreground">
                {deleteTarget ? money.format(Number(deleteTarget.amount)) : ''}
              </span>
              {t.dialog.delete.confirmSuffix}
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
              {deleting ? t.dialog.delete.confirming : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

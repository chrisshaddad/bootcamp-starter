'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  FileTextIcon,
  ReceiptIcon,
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

import { useGetInvoiceQuery } from '@/store/api/endpoints/invoices.api';
import {
  useListInvoicePaymentsQuery,
  useCreateInvoicePaymentMutation,
  useDeleteInvoicePaymentMutation,
} from '@/store/api/endpoints/invoice-payments.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import type {
  InvoiceLineItemCategory,
  InvoicePaymentMethod,
  InvoicePaymentResponse,
  InvoiceStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Status badge (mirrors invoices-page.tsx) ──────────────────────────────────

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

// ── Payment method ───────────────────────────────────────────────────────────

const PAYMENT_METHODS: InvoicePaymentMethod[] = [
  'cash',
  'check',
  'bank_transfer',
  'card',
  'other',
];

// ── Record Payment form ───────────────────────────────────────────────────────

function buildPaymentSchema(
  errors: Dictionary['invoices']['detail']['form']['errors'],
) {
  return z.object({
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

const EMPTY_PAYMENT: PaymentFormValues = {
  amount: '',
  method: 'cash',
  paidAt: '',
  notes: '',
};

// ── Main component ────────────────────────────────────────────────────────────

interface InvoiceDetailPageProps {
  invoiceId: string;
  locale: string;
  canWrite: boolean;
  dict: Dictionary;
}

export function InvoiceDetailPage({
  invoiceId,
  locale,
  canWrite,
  dict,
}: InvoiceDetailPageProps) {
  const t = dict.invoices;
  const {
    data: invoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
  } = useGetInvoiceQuery(invoiceId);
  const {
    data: payments,
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useListInvoicePaymentsQuery(invoiceId);
  const { data: buildings } = useListBuildingsQuery();

  const [createPayment, { isLoading: creating }] =
    useCreateInvoicePaymentMutation();
  const [deletePayment, { isLoading: deleting }] =
    useDeleteInvoicePaymentMutation();

  const [recordOpen, setRecordOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<InvoicePaymentResponse | null>(null);

  const schema = useMemo(
    () => buildPaymentSchema(t.detail.form.errors),
    [t.detail.form.errors],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_PAYMENT,
  });

  const buildingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of buildings ?? []) map.set(b.id, b.name);
    return map;
  }, [buildings]);

  async function onRecordSubmit(values: PaymentFormValues) {
    try {
      await createPayment({
        invoiceId,
        amount: Number(values.amount),
        method: values.method,
        paidAt: values.paidAt,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success(t.detail.dialog.record.success);
      setRecordOpen(false);
      reset(EMPTY_PAYMENT);
    } catch {
      toast.error(t.detail.dialog.record.error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletePayment({ id: deleteTarget.id, invoiceId }).unwrap();
      toast.success(t.detail.dialog.delete.success);
      setDeleteTarget(null);
    } catch {
      toast.error(t.detail.dialog.delete.error);
    }
  }

  if (invoiceLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (invoiceError || !invoice) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href={`/${locale}/dashboard/invoices`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          {t.detail.backLink}
        </Link>
        <p className="text-sm text-muted-foreground">{t.detail.loadError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/dashboard/invoices`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        {t.detail.backLink}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileTextIcon className="size-6 text-muted-foreground" />
          <Link
            href={`/${locale}/dashboard/renters/${invoice.renterId}`}
            className="hover:underline"
          >
            {invoice.renterName}
          </Link>{' '}
          · {invoice.apartmentUnitNumber}
        </h1>
        <StatusBadge status={invoice.status} labels={t.status} />
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {t.detail.info.building}
          </p>
          <p className="text-sm">
            <Link
              href={`/${locale}/dashboard/buildings/${invoice.buildingId}`}
              className="hover:underline"
            >
              {buildingNameById.get(invoice.buildingId) ?? invoice.buildingId}
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {t.detail.info.dueDate}
          </p>
          <p className="text-sm">
            {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.detail.info.total}</p>
          <p className="text-sm font-medium">{invoice.totalAmount}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.detail.info.paid}</p>
          <p className="text-sm font-medium">{invoice.paidAmount}</p>
        </div>
        {invoice.notes && (
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
            <p className="text-xs text-muted-foreground">
              {t.detail.info.notes}
            </p>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {t.detail.lineItems.title}
        </h2>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.detail.lineItems.table.category}</TableHead>
              <TableHead>{t.detail.lineItems.table.description}</TableHead>
              <TableHead>{t.detail.lineItems.table.amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((li) => (
              <TableRow key={li.id}>
                <TableCell className="text-sm">
                  {t.lineItemCategory[li.category as InvoiceLineItemCategory] ??
                    li.category}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {li.description ?? '—'}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {li.amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Payments */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {t.detail.payments.title}
        </h2>
        {canWrite && (
          <Button
            onClick={() => {
              reset(EMPTY_PAYMENT);
              setRecordOpen(true);
            }}
          >
            <PlusIcon />
            {t.detail.payments.recordButton}
          </Button>
        )}
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.detail.payments.table.amount}</TableHead>
              <TableHead>{t.detail.payments.table.method}</TableHead>
              <TableHead>{t.detail.payments.table.paidAt}</TableHead>
              <TableHead>{t.detail.payments.table.notes}</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentsLoading ? (
              <>
                {[...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : paymentsError ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.detail.payments.loadError}
                </TableCell>
              </TableRow>
            ) : !payments?.length ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ReceiptIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite
                    ? t.detail.payments.emptyWrite
                    : t.detail.payments.empty}
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm font-medium">
                    {payment.amount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.paymentMethod[payment.method as InvoicePaymentMethod] ??
                      payment.method}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(payment.paidAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.notes ?? '—'}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.detail.payments.deleteAriaLabel}
                        onClick={() => setDeleteTarget(payment)}
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

      {/* ── Record Payment Dialog ───────────────────────────────────────────── */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.detail.dialog.record.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onRecordSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-amount">
                {t.detail.dialog.record.amountLabel}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rp-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={t.detail.dialog.record.amountPlaceholder}
                aria-invalid={!!errors.amount}
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-method">
                {t.detail.dialog.record.methodLabel}{' '}
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
                            ? t.detail.dialog.record.selectMethod
                            : (t.paymentMethod[value as InvoicePaymentMethod] ??
                              value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {t.paymentMethod[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-paidAt">
                {t.detail.dialog.record.paidAtLabel}{' '}
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
                {t.detail.dialog.record.notesLabel}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.detail.dialog.record.optional}
                </span>
              </Label>
              <Textarea
                id="rp-notes"
                placeholder={t.detail.dialog.record.notesPlaceholder}
                rows={2}
                {...register('notes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setRecordOpen(false);
                  reset(EMPTY_PAYMENT);
                }}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating
                  ? t.detail.dialog.record.submitting
                  : t.detail.dialog.record.submit}
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
            <DialogTitle>{t.detail.dialog.delete.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.detail.dialog.delete.confirmPrefix}{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.amount}
              </span>{' '}
              {t.detail.dialog.delete.confirmSuffix}
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
              {deleting
                ? t.detail.dialog.delete.confirming
                : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

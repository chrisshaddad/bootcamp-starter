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

// ── Status badge (mirrors invoices-page.tsx) ──────────────────────────────────

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

const LINE_ITEM_CATEGORY_LABELS: Record<InvoiceLineItemCategory, string> = {
  rent: 'Rent',
  late_fee: 'Late fee',
  utilities: 'Utilities',
  damages: 'Damages',
  deposit: 'Deposit',
  other: 'Other',
};

// ── Payment method ───────────────────────────────────────────────────────────

const PAYMENT_METHODS: InvoicePaymentMethod[] = [
  'cash',
  'check',
  'bank_transfer',
  'card',
  'other',
];

const PAYMENT_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  other: 'Other',
};

// ── Record Payment form ───────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
      'Amount must be a positive number',
    ),
  method: z.enum(['cash', 'check', 'bank_transfer', 'card', 'other']),
  paidAt: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

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
}

export function InvoiceDetailPage({
  invoiceId,
  locale,
  canWrite,
}: InvoiceDetailPageProps) {
  const {
    data: invoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
  } = useGetInvoiceQuery(invoiceId);
  const { data: payments, isLoading: paymentsLoading } =
    useListInvoicePaymentsQuery(invoiceId);
  const { data: buildings } = useListBuildingsQuery();

  const [createPayment, { isLoading: creating }] =
    useCreateInvoicePaymentMutation();
  const [deletePayment, { isLoading: deleting }] =
    useDeleteInvoicePaymentMutation();

  const [recordOpen, setRecordOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvoicePaymentResponse | null>(
    null,
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
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
      toast.success('Payment recorded.');
      setRecordOpen(false);
      reset(EMPTY_PAYMENT);
    } catch {
      toast.error('Failed to record payment. Please try again.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletePayment({ id: deleteTarget.id, invoiceId }).unwrap();
      toast.success('Payment deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete payment. Please try again.');
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
          Back to invoices
        </Link>
        <p className="text-sm text-muted-foreground">
          Failed to load this invoice.
        </p>
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
        Back to invoices
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileTextIcon className="size-6 text-muted-foreground" />
          {invoice.renterName} · {invoice.apartmentUnitNumber}
        </h1>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Building</p>
          <p className="text-sm">
            {buildingNameById.get(invoice.buildingId) ?? invoice.buildingId}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Due date</p>
          <p className="text-sm">
            {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-medium">{invoice.totalAmount}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-sm font-medium">{invoice.paidAmount}</p>
        </div>
        {invoice.notes && (
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Line items</h2>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((li) => (
              <TableRow key={li.id}>
                <TableCell className="text-sm">
                  {LINE_ITEM_CATEGORY_LABELS[li.category] ?? li.category}
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
        <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
        {canWrite && (
          <Button
            onClick={() => {
              reset(EMPTY_PAYMENT);
              setRecordOpen(true);
            }}
          >
            <PlusIcon />
            Record payment
          </Button>
        )}
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Paid at</TableHead>
              <TableHead>Notes</TableHead>
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
            ) : !payments?.length ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ReceiptIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite
                    ? 'No payments recorded yet. Record the first payment.'
                    : 'No payments recorded yet.'}
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm font-medium">
                    {payment.amount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
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
                        aria-label="Delete payment"
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
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onRecordSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rp-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
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
                Method <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rp-method" className="w-full">
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-paidAt">
                Paid at <span className="text-destructive">*</span>
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
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="rp-notes"
                placeholder="Any notes…"
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
                Cancel
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? 'Recording…' : 'Record payment'}
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
            <DialogTitle>Delete payment</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.amount}
              </span>{' '}
              payment? This action cannot be undone.
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

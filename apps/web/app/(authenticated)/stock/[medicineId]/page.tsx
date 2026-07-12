'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Layers,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  stockBatchUpdateRequestSchema,
  type StockBatchResponse,
  type StockBatchUpdateRequest,
} from '@repo/contracts';
import { useStockMedicineDetail, useStockActions } from '@/hooks/use-stock';
import { AddBatchDialog } from '@/components/stock/add-batch-dialog';
import { QuantityPill } from '@/components/stock/quantity-pill';
import { ApiError } from '@/lib/api';
import {
  expiryStatus,
  formatDate,
  formatPrice,
  isLowQuantity,
  medicineSubtitle,
  toDateInputValue,
} from '@/lib/stock';
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
import { ENTER, enterStyle } from '@/lib/enter-animation';

function ExpiryBadge({ value }: { value: string | Date }) {
  const status = expiryStatus(value);
  if (status === 'ok') return null;
  const style =
    status === 'expired'
      ? 'bg-error/10 text-error'
      : 'bg-warning/10 text-warning-dark';
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status === 'expired' ? 'Expired' : 'Near expiry'}
    </span>
  );
}

function EditBatchDialog({
  batch,
  branchName,
  onClose,
}: {
  batch: StockBatchResponse;
  branchName?: string;
  onClose: () => void;
}) {
  const { updateBatch } = useStockActions();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof stockBatchUpdateRequestSchema>,
    unknown,
    StockBatchUpdateRequest
  >({
    resolver: zodResolver(stockBatchUpdateRequestSchema),
    defaultValues: {
      batchNumber: batch.batchNumber ?? '',
      quantity: batch.quantity,
      expiryDate: toDateInputValue(batch.expiryDate),
    },
  });

  async function onSubmit(data: StockBatchUpdateRequest) {
    try {
      await updateBatch(batch.id, data);
      toast.success('Batch updated.');
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update batch.',
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      {/* Don't auto-focus the first field (Quantity) on open — it selects the
          value and invites an accidental overwrite. */}
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit batch</DialogTitle>
            <DialogDescription>
              Update the quantity, expiry, or lot number for this batch.
            </DialogDescription>
            {branchName ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
                Editing stock at
                <span className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 font-semibold text-primary-hover">
                  <Building2 className="h-3.5 w-3.5" />
                  {branchName}
                </span>
              </div>
            ) : null}
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <label className="text-sm font-medium text-gray-700">
                Batch number{' '}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <Input {...register('batchNumber')} placeholder="e.g. LOT-2291" />
              {errors.batchNumber ? (
                <p className="text-xs text-error">
                  {errors.batchNumber.message}
                </p>
              ) : null}
            </div>
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
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBatchDialog({
  batch,
  onClose,
}: {
  batch: StockBatchResponse;
  onClose: () => void;
}) {
  const { deleteBatch } = useStockActions();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBatch(batch.id);
      toast.success('Batch deleted.');
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete batch.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete batch</DialogTitle>
          <DialogDescription>
            This permanently removes {batch.quantity} unit
            {batch.quantity === 1 ? '' : 's'}
            {batch.batchNumber ? ` (lot ${batch.batchNumber})` : ''} from stock.
            The medicine total recomputes from the remaining batches. This
            cannot be undone.
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
            {deleting ? 'Deleting…' : 'Delete batch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type BatchDialog =
  | { mode: 'edit'; batch: StockBatchResponse }
  | { mode: 'delete'; batch: StockBatchResponse }
  | null;

function StockMedicineDetailContent() {
  const { medicineId } = useParams<{ medicineId: string }>();
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') ?? undefined;

  const [addOpen, setAddOpen] = useState(false);
  const [dialog, setDialog] = useState<BatchDialog>(null);

  const { detail, isLoading, error, mutate } = useStockMedicineDetail(
    medicineId,
    branchId,
  );

  const backHref = branchId ? `/stock?branchId=${branchId}` : '/stock';

  return (
    <div className="space-y-6">
      <div className={ENTER} style={enterStyle(0)}>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stock
        </Link>
      </div>

      {error ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load this medicine
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              {error instanceof ApiError && error.status === 404
                ? 'This medicine could not be found for your branch.'
                : 'Something went wrong. Please try again.'}
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !detail ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div
            className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${ENTER}`}
            style={enterStyle(70)}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-hover">
                <Package className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  {detail.medicine.brandName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  {(() => {
                    const meta = [
                      medicineSubtitle(
                        detail.medicine.form,
                        detail.medicine.dosage,
                      ),
                      detail.medicine.barcode
                        ? `#${detail.medicine.barcode}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join('  ·  ');
                    return meta ? <span>{meta}</span> : null;
                  })()}
                  {detail.medicine.priceLbp !== null && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 font-semibold text-success">
                      {formatPrice(detail.medicine.priceLbp)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 font-semibold text-primary-hover">
                    <Building2 className="h-3.5 w-3.5" />
                    {detail.branchName}
                  </span>
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 w-44 shrink-0 justify-center px-6 text-base"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Add batch
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <Card className={`py-0 ${ENTER}`} style={enterStyle(140)}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total quantity</p>
                  <p className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                    {detail.totalQuantity}
                    {isLowQuantity(detail.totalQuantity) ? (
                      <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning-dark">
                        Low
                      </span>
                    ) : null}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className={`py-0 ${ENTER}`} style={enterStyle(200)}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Batches</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {detail.batches.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card
            className={`gap-0 overflow-hidden py-0 ${ENTER}`}
            style={enterStyle(260)}
          >
            {detail.batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="mb-4 h-12 w-12 text-gray-300" />
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  No batches yet
                </h3>
                <p className="max-w-md text-center text-sm text-gray-500">
                  Add a batch to start tracking this medicine&apos;s stock.
                </p>
              </div>
            ) : (
              <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Batch number</TableHead>
                    <TableHead className="w-28">Quantity</TableHead>
                    <TableHead className="w-56">Expiry</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium text-gray-900">
                        {batch.batchNumber ?? (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <QuantityPill quantity={batch.quantity} />
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-sm text-gray-700">
                            {formatDate(batch.expiryDate)}
                          </span>
                          <ExpiryBadge value={batch.expiryDate} />
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Edit batch"
                            onClick={() => setDialog({ mode: 'edit', batch })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Delete batch"
                            className="text-error hover:bg-error/10 hover:text-error"
                            onClick={() => setDialog({ mode: 'delete', batch })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {addOpen ? (
            <AddBatchDialog
              branchId={detail.branchId}
              branchName={detail.branchName}
              presetMedicine={detail.medicine}
              onClose={() => setAddOpen(false)}
            />
          ) : null}
        </>
      )}

      {dialog?.mode === 'edit' ? (
        <EditBatchDialog
          batch={dialog.batch}
          branchName={detail?.branchName}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === 'delete' ? (
        <DeleteBatchDialog
          batch={dialog.batch}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

// useSearchParams() must sit under a Suspense boundary so the route can be
// prerendered without bailing (mirrors app/auth/verify/page.tsx).
export default function StockMedicineDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <StockMedicineDetailContent />
    </Suspense>
  );
}

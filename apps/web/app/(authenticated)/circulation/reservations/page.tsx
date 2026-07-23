'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Bookmark } from 'lucide-react';

import {
  useReservations,
  useReservationActions,
} from '@/hooks/use-reservations';
import { useBookCopies } from '@/hooks/use-book-copies';
import { ApiError } from '@/lib/api';
import {
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
} from '@/lib/status-maps';
import { CONDITION_LABELS } from '@/lib/book-condition';
import { RequireRole } from '@/components/require-role';
import { StatusBadge } from '@/components/status-badge';
import { TablePagination } from '@/components/table-pagination';
import { Combobox } from '@/components/combobox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { ReservationResponse, ReservationStatus } from '@repo/contracts';

const PAGE_SIZE = 20;

// The statuses staff filter by. "Active" is the default queue (holds waiting to
// be set aside); "Ready for pickup" is the awaiting-collection queue.
const STATUS_FILTERS: { value: ReservationStatus | 'ALL'; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for pickup' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ALL', label: 'All' },
];

function fmtDate(value?: Date | string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function ReservationsPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage reservations."
    >
      <ReservationsManager />
    </RequireRole>
  );
}

function ReservationsManager() {
  const [status, setStatus] = useState<ReservationStatus | 'ALL'>('ACTIVE');
  const [page, setPage] = useState(1);

  const { reservations, total, isLoading, mutate } = useReservations({
    status: status === 'ALL' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  const [readyFor, setReadyFor] = useState<ReservationResponse | null>(null);
  const [cancelling, setCancelling] = useState<ReservationResponse | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);

  const { fulfill, cancel } = useReservationActions();

  const handleFulfill = async (reservation: ReservationResponse) => {
    setPending(reservation.id);
    try {
      const res = await fulfill(reservation.id);
      toast.success(res.message);
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to fulfill reservation',
      );
    } finally {
      setPending(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    setPending(cancelling.id);
    try {
      const res = await cancel(cancelling.id);
      toast.success(res.message);
      setCancelling(null);
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to cancel reservation',
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Work holds through their lifecycle: set a copy aside, hand it over,
            or cancel.
          </p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as ReservationStatus | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Holds
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !reservations?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No reservations found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Preferred</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-foreground">
                        {r.book.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.member.libraryCardNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.preferredCondition
                          ? CONDITION_LABELS[r.preferredCondition]
                          : 'Any'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(r.reservedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(r.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={r.status}
                          labels={RESERVATION_STATUS_LABELS}
                          colors={RESERVATION_STATUS_COLORS}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {r.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              disabled={pending !== null}
                              onClick={() => setReadyFor(r)}
                            >
                              Mark ready
                            </Button>
                          )}
                          {r.status === 'READY_FOR_PICKUP' && (
                            <Button
                              size="sm"
                              disabled={pending !== null}
                              onClick={() => handleFulfill(r)}
                            >
                              {pending === r.id ? 'Fulfilling…' : 'Fulfill'}
                            </Button>
                          )}
                          {(r.status === 'ACTIVE' ||
                            r.status === 'READY_FOR_PICKUP') && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending !== null}
                              onClick={() => setCancelling(r)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                total={total ?? 0}
                limit={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <MarkReadyDialog
        reservation={readyFor}
        onClose={() => setReadyFor(null)}
        onDone={mutate}
      />

      <Dialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel reservation?</DialogTitle>
            <DialogDescription>
              This cancels the hold on &ldquo;{cancelling?.book.title}&rdquo;
              for member {cancelling?.member.libraryCardNumber}. Any copy set
              aside is released back to the shelf.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              disabled={pending !== null}
              onClick={handleCancel}
            >
              {pending ? 'Cancelling…' : 'Cancel reservation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MarkReadyDialogProps {
  reservation: ReservationResponse | null;
  onClose: () => void;
  onDone: () => Promise<unknown>;
}

function MarkReadyDialog({
  reservation,
  onClose,
  onDone,
}: MarkReadyDialogProps) {
  const open = !!reservation;
  const [copyId, setCopyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { markReady } = useReservationActions();

  // Available copies of this title. If the patron requested a specific
  // condition, only those copies can satisfy the hold (the API enforces this),
  // so filter the picker to match.
  const { bookCopies, isLoading } = useBookCopies({
    bookId: reservation?.bookId,
    status: 'AVAILABLE',
    limit: 100,
    enabled: open,
  });

  const options = useMemo(() => {
    const preferred = reservation?.preferredCondition;
    return (bookCopies ?? [])
      .filter((c) => !preferred || c.condition === preferred)
      .map((c) => ({
        value: c.id,
        label: c.barcode,
        description: CONDITION_LABELS[c.condition],
      }));
  }, [bookCopies, reservation]);

  const handleConfirm = async () => {
    if (!reservation || !copyId) return;
    setSaving(true);
    try {
      const res = await markReady(reservation.id, { bookCopyId: copyId });
      toast.success(res.message);
      await onDone();
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to mark ready',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCopyId(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark ready for pickup</DialogTitle>
          <DialogDescription>
            Set aside a copy of &ldquo;{reservation?.book.title}&rdquo; for
            member {reservation?.member.libraryCardNumber}.
            {reservation?.preferredCondition
              ? ` They requested ${CONDITION_LABELS[reservation.preferredCondition].toLowerCase()} condition.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Available copy</Label>
          <Combobox
            options={options}
            value={copyId}
            onChange={setCopyId}
            loading={isLoading}
            placeholder="Select a copy"
            searchPlaceholder="Search barcode…"
            emptyText={isLoading ? 'Loading…' : 'No matching available copies'}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!copyId || saving}>
            {saving ? 'Setting aside…' : 'Mark ready'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

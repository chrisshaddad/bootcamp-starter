'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookDown } from 'lucide-react';

import { useBookCopies } from '@/hooks/use-book-copies';
import { useRentals, useRentalActions } from '@/hooks/use-rentals';
import { useDebounce } from '@/hooks/use-debounce';
import { ApiError } from '@/lib/api';
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS } from '@/lib/status-maps';
import { RequireRole } from '@/components/require-role';
import { Combobox } from '@/components/combobox';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value || '—'}
      </span>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can check in books."
    >
      <CheckIn />
    </RequireRole>
  );
}

function CheckIn() {
  const { returnRental, markLost, payFine } = useRentalActions();

  const [copySearch, setCopySearch] = useState('');
  const debouncedCopy = useDebounce(copySearch, 300);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  const { bookCopies, isLoading: copiesLoading } = useBookCopies({
    status: 'ON_LOAN',
    search: debouncedCopy,
    limit: 10,
  });

  // A copy has at most one open (not-returned) rental.
  const { rentals, mutate } = useRentals({
    bookCopyId: copyId ?? undefined,
    limit: 5,
    enabled: !!copyId,
  });
  const openRental = rentals?.find((r) => !r.returnedAt);

  const copyOptions = useMemo(
    () =>
      (bookCopies ?? []).map((c) => ({
        value: c.id,
        label: `${c.barcode} · ${c.book.title}`,
      })),
    [bookCopies],
  );

  const reset = () => {
    setCopyId(null);
    setCopySearch('');
    setNotes('');
  };

  const runAction = async (
    key: string,
    fn: () => Promise<{ message: string }>,
  ) => {
    setPending(key);
    try {
      const res = await fn();
      toast.success(res.message);
      await mutate();
      if (key === 'return' || key === 'lost') reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Look up an on-loan copy by barcode to return it or record a fine.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookDown className="h-5 w-5" />
            Find loan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>On-loan copy</Label>
            <Combobox
              options={copyOptions}
              value={copyId}
              onChange={setCopyId}
              onSearchChange={setCopySearch}
              loading={copiesLoading}
              placeholder="Select a copy"
              searchPlaceholder="Search barcode or title…"
              emptyText="No on-loan copies found"
            />
          </div>

          {copyId && !openRental && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No open loan found for this copy.
            </div>
          )}

          {openRental && (
            <div className="space-y-4">
              <div>
                <InfoRow label="Title" value={openRental.bookCopy.book.title} />
                <InfoRow label="Barcode" value={openRental.bookCopy.barcode} />
                <InfoRow
                  label="Member"
                  value={openRental.member.libraryCardNumber}
                />
                <InfoRow
                  label="Due"
                  value={new Date(openRental.dueDate).toLocaleDateString()}
                />
                <InfoRow
                  label="Status"
                  value={
                    <StatusBadge
                      status={openRental.status}
                      labels={RENTAL_STATUS_LABELS}
                      colors={RENTAL_STATUS_COLORS}
                    />
                  }
                />
                <InfoRow
                  label="Current fine"
                  value={
                    Number(openRental.fineAmount) > 0
                      ? `$${openRental.fineAmount}${openRental.finePaid ? ' (paid)' : ''}`
                      : '—'
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. returned with minor damage"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending !== null}
                  onClick={() =>
                    runAction('return', () =>
                      returnRental(openRental.id, {
                        notes: notes || undefined,
                      }),
                    )
                  }
                >
                  {pending === 'return' ? 'Returning…' : 'Return'}
                </Button>
                <Button
                  variant="outline"
                  disabled={pending !== null}
                  onClick={() =>
                    runAction('lost', () =>
                      markLost(openRental.id, { notes: notes || undefined }),
                    )
                  }
                >
                  {pending === 'lost' ? 'Marking…' : 'Mark lost'}
                </Button>
                {Number(openRental.fineAmount) > 0 && !openRental.finePaid && (
                  <Button
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() =>
                      runAction('pay', () => payFine(openRental.id))
                    }
                  >
                    {pending === 'pay' ? 'Recording…' : 'Pay fine'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

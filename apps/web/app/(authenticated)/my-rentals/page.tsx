'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/use-auth';
import { usePortalRentals } from '@/hooks/use-portal-rentals';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { BookCover } from '@/components/book-cover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock } from 'lucide-react';
import type { RentalResponse } from '@repo/contracts';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  RETURNED: 'Returned',
  OVERDUE: 'Overdue',
  LOST: 'Lost',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success-light text-success-dark',
  RETURNED: 'bg-muted text-muted-foreground',
  OVERDUE: 'bg-error-light text-error',
  LOST: 'bg-error-light text-error',
};

export default function MyRentalsPage() {
  const { user, isLoading: userLoading } = useUser();
  const hasActiveLibrary = !!user?.activeOrganizationId;
  const [selected, setSelected] = useState<RentalResponse | null>(null);

  const { rentals, total, isLoading, error } = usePortalRentals({
    enabled: hasActiveLibrary,
  });

  if (userLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!hasActiveLibrary) {
    return (
      <div className="py-20 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground/60" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Select a library first
        </h2>
        <a
          href="/my-libraries"
          className="mt-4 inline-block text-sm text-library-primary hover:underline"
        >
          Go to My Libraries
        </a>
      </div>
    );
  }

  const totalDue = (rental: RentalResponse) =>
    !rental.finePaid && Number(rental.fineAmount) > 0
      ? Number(rental.fineAmount)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Rentals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Books currently or previously checked out to you - click a row for
          details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Rentals
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load your rentals
            </div>
          ) : !rentals?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              You have no rentals yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Due Now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentals.map((rental) => (
                  <TableRow
                    key={rental.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(rental)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <BookCover
                          coverUrl={rental.bookCopy.book.coverUrl}
                          title={rental.bookCopy.book.title}
                          className="h-12 w-9 shrink-0 rounded-sm"
                        />
                        <span className="font-medium text-foreground">
                          {rental.bookCopy.book.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rental.bookCopy.barcode}
                    </TableCell>
                    <TableCell
                      className={
                        rental.status === 'OVERDUE'
                          ? 'font-medium text-error'
                          : 'text-muted-foreground'
                      }
                    >
                      {new Date(rental.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={rental.status}
                        labels={STATUS_LABELS}
                        colors={STATUS_COLORS}
                      />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalDue(rental) > 0
                        ? `$${totalDue(rental).toFixed(2)}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.bookCopy.book.title}</DialogTitle>
              </DialogHeader>

              <div className="flex gap-4">
                <BookCover
                  coverUrl={selected.bookCopy.book.coverUrl}
                  title={selected.bookCopy.book.title}
                  className="h-32 w-22 shrink-0 rounded-md"
                />

                <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <StatusBadge
                        status={selected.status}
                        labels={STATUS_LABELS}
                        colors={STATUS_COLORS}
                        className="mt-0.5"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Barcode</dt>
                    <dd className="font-medium text-foreground">
                      {selected.bookCopy.barcode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rented</dt>
                    <dd className="font-medium text-foreground">
                      {new Date(selected.rentedAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Due</dt>
                    <dd
                      className={
                        selected.status === 'OVERDUE'
                          ? 'font-medium text-error'
                          : 'font-medium text-foreground'
                      }
                    >
                      {new Date(selected.dueDate).toLocaleDateString()}
                    </dd>
                  </div>
                  {selected.bookCopy.book.salePrice && (
                    <div>
                      <dt className="text-muted-foreground">Book Value</dt>
                      <dd className="font-medium text-foreground">
                        ${selected.bookCopy.book.salePrice}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fine</span>
                  <span className="text-foreground">
                    {Number(selected.fineAmount) > 0
                      ? `$${selected.fineAmount}`
                      : '$0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-foreground">
                    {selected.finePaid ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                  <span className="text-foreground">Total Due</span>
                  <span
                    className={
                      totalDue(selected) > 0 ? 'text-error' : 'text-foreground'
                    }
                  >
                    ${totalDue(selected).toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

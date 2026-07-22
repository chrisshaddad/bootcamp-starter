'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';

import { useRentals, useRentalActions } from '@/hooks/use-rentals';
import { ApiError } from '@/lib/api';
import { RequireRole } from '@/components/require-role';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysOverdue(dueDate: string | Date): number {
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}

export default function OverduePage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can view overdue loans."
    >
      <Overdue />
    </RequireRole>
  );
}

function Overdue() {
  const [page, setPage] = useState(1);
  const { rentals, total, isLoading, error, mutate } = useRentals({
    overdue: true,
    page,
    limit: PAGE_SIZE,
  });
  const { returnRental, markLost } = useRentalActions();
  const [pending, setPending] = useState<string | null>(null);

  const runAction = async (
    id: string,
    key: string,
    fn: () => Promise<{ message: string }>,
  ) => {
    setPending(`${id}:${key}`);
    try {
      const res = await fn();
      toast.success(res.message);
      await mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overdue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Loans past their due date that haven&apos;t been returned.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Overdue loans
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
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load overdue loans
            </div>
          ) : !rentals?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              Nothing overdue — nicely done.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Days overdue</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead className="w-40 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentals.map((rental) => {
                    const busy = pending?.startsWith(`${rental.id}:`);
                    return (
                      <TableRow key={rental.id}>
                        <TableCell className="font-medium text-foreground">
                          {rental.bookCopy.book.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rental.bookCopy.barcode}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rental.member.libraryCardNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(rental.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium text-error">
                          {daysOverdue(rental.dueDate)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {Number(rental.fineAmount) > 0
                            ? `$${rental.fineAmount}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                runAction(rental.id, 'return', () =>
                                  returnRental(rental.id),
                                )
                              }
                            >
                              Return
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                runAction(rental.id, 'lost', () =>
                                  markLost(rental.id),
                                )
                              }
                            >
                              Lost
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
    </div>
  );
}

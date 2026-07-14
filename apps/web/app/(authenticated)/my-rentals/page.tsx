'use client';

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
import { Clock } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Rentals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Books currently or previously checked out to you
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
                  <TableHead>Fine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentals.map((rental) => (
                  <TableRow key={rental.id}>
                    <TableCell className="font-medium text-foreground">
                      {rental.bookCopy.book.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rental.bookCopy.barcode}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(rental.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={rental.status}
                        labels={STATUS_LABELS}
                        colors={STATUS_COLORS}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {Number(rental.fineAmount) > 0
                        ? `$${rental.fineAmount}${rental.finePaid ? ' (paid)' : ''}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

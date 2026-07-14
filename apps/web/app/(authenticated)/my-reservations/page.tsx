'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { usePortalReservations } from '@/hooks/use-portal-reservations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { Bookmark } from 'lucide-react';
import { ApiError } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Waiting',
  READY_FOR_PICKUP: 'Ready for Pickup',
  FULFILLED: 'Picked Up',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-muted text-muted-foreground',
  READY_FOR_PICKUP: 'bg-success-light text-success-dark',
  FULFILLED: 'bg-library-primary-100 text-library-primary-900',
  EXPIRED: 'bg-error-light text-error',
  CANCELLED: 'bg-error-light text-error',
};

export default function MyReservationsPage() {
  const { user, isLoading: userLoading } = useUser();
  const hasActiveLibrary = !!user?.activeOrganizationId;
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { reservations, total, isLoading, error, cancelHold } =
    usePortalReservations({ enabled: hasActiveLibrary });

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelHold(id);
      toast.success('Hold cancelled');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to cancel hold');
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (userLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!hasActiveLibrary) {
    return (
      <div className="py-20 text-center">
        <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/60" />
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
        <h1 className="text-2xl font-bold text-foreground">My Reservations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Holds you&apos;ve placed on books
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Reservations
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
              Failed to load your reservations
            </div>
          ) : !reservations?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              You have no holds yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => {
                  const canCancel =
                    reservation.status === 'ACTIVE' ||
                    reservation.status === 'READY_FOR_PICKUP';

                  return (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium text-foreground">
                        {reservation.book.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(reservation.reservedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={reservation.status}
                          labels={STATUS_LABELS}
                          colors={STATUS_COLORS}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-error border-error/30 hover:bg-error-light"
                            disabled={cancellingId === reservation.id}
                            onClick={() => handleCancel(reservation.id)}
                          >
                            {cancellingId === reservation.id
                              ? 'Cancelling...'
                              : 'Cancel'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

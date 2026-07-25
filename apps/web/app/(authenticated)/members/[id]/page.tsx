'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookMarked,
  CalendarClock,
  Check,
  ShoppingBag,
} from 'lucide-react';

import {
  useLibraryMember,
  useLibraryMembers,
} from '@/hooks/use-library-members';
import { useRentals } from '@/hooks/use-rentals';
import { useReservations } from '@/hooks/use-reservations';
import { usePurchases } from '@/hooks/use-purchases';
import { ApiError } from '@/lib/api';
import {
  MEMBER_STATUS_LABELS,
  MEMBER_STATUS_COLORS,
  MEMBERSHIP_TYPE_LABELS,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
} from '@/lib/status-maps';
import { CONDITION_LABELS } from '@/lib/book-condition';
import { RequireRole } from '@/components/require-role';
import { StatusBadge } from '@/components/status-badge';
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

// Fetch the member's full history (up to this cap) so the summary counts are
// accurate, then paginate the tables on the client. A single member is very
// unlikely to exceed this many records.
const HISTORY_LIMIT = 500;
const HISTORY_PAGE_SIZE = 10;

export default function MemberDetailPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage members."
    >
      <MemberDetail />
    </RequireRole>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="wrap-break-word text-right text-sm font-medium text-foreground">
        {value || '—'}
      </span>
    </div>
  );
}

function fmtDate(value?: Date | string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function MemberDetail() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const { member, isLoading, error, mutate } = useLibraryMember(memberId);
  const { approve } = useLibraryMembers({ enabled: false });
  const {
    rentals,
    total: rentalTotal,
    isLoading: rentalsLoading,
  } = useRentals({ memberId, limit: HISTORY_LIMIT });
  const {
    reservations,
    total: reservationTotal,
    isLoading: reservationsLoading,
  } = useReservations({ memberId, limit: HISTORY_LIMIT });
  const {
    purchases,
    total: purchaseTotal,
    isLoading: purchasesLoading,
  } = usePurchases({ memberId, limit: HISTORY_LIMIT });

  const [isApproving, setIsApproving] = useState(false);
  const [rentalPage, setRentalPage] = useState(1);
  const [reservationPage, setReservationPage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approve(memberId);
      await mutate();
      toast.success('Member approved');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to approve member',
      );
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <div className="py-10 text-center text-error">
          {error ? 'Failed to load member' : 'Member not found'}
        </div>
        <div className="text-center">
          <Button variant="outline" onClick={() => router.push('/members')}>
            <ArrowLeft className="h-4 w-4" />
            Back to members
          </Button>
        </div>
      </div>
    );
  }

  // Summary stats are computed over the fetched history (capped at
  // HISTORY_LIMIT); the total-count tiles use the API's `total` so they stay
  // exact even if a member somehow exceeds the cap.
  const activeLoans =
    rentals?.filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE')
      .length ?? 0;
  const outstandingFines =
    rentals
      ?.filter((r) => !r.finePaid)
      .reduce((sum, r) => sum + Number(r.fineAmount), 0) ?? 0;

  const pagedRentals =
    rentals?.slice(
      (rentalPage - 1) * HISTORY_PAGE_SIZE,
      rentalPage * HISTORY_PAGE_SIZE,
    ) ?? [];
  const pagedReservations =
    reservations?.slice(
      (reservationPage - 1) * HISTORY_PAGE_SIZE,
      reservationPage * HISTORY_PAGE_SIZE,
    ) ?? [];
  const pagedPurchases =
    purchases?.slice(
      (purchasePage - 1) * HISTORY_PAGE_SIZE,
      purchasePage * HISTORY_PAGE_SIZE,
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push('/members')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to members
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {member.user?.name ?? 'Walk-in member'}
            </h1>
            <StatusBadge
              status={member.membershipStatus}
              labels={MEMBER_STATUS_LABELS}
              colors={MEMBER_STATUS_COLORS}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Card {member.libraryCardNumber}
          </p>
        </div>
        {member.membershipStatus === 'PENDING' && (
          <Button onClick={handleApprove} disabled={isApproving}>
            <Check className="h-4 w-4" />
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Type"
              value={
                MEMBERSHIP_TYPE_LABELS[member.membershipType] ??
                member.membershipType
              }
            />
            <InfoRow
              label="Email"
              value={member.user?.email ?? 'No linked login'}
            />
            <InfoRow
              label="Start date"
              value={fmtDate(member.membershipStartDate)}
            />
            <InfoRow
              label="End date"
              value={fmtDate(member.membershipEndDate)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Active loans" value={activeLoans} />
            <InfoRow
              label="Outstanding fines"
              value={`$${outstandingFines.toFixed(2)}`}
            />
            <InfoRow label="Total rentals" value={rentalTotal ?? 0} />
            <InfoRow label="Total reservations" value={reservationTotal ?? 0} />
            <InfoRow label="Total purchases" value={purchaseTotal ?? 0} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Rental history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rentalsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !rentals?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No rentals yet
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Rented</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fine</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRentals.map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell className="font-medium text-foreground">
                        {rental.bookCopy.book.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rental.bookCopy.barcode}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(rental.rentedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(rental.dueDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(rental.returnedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={rental.status}
                          labels={RENTAL_STATUS_LABELS}
                          colors={RENTAL_STATUS_COLORS}
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
              <TablePagination
                page={rentalPage}
                total={rentals?.length ?? 0}
                limit={HISTORY_PAGE_SIZE}
                onPageChange={setRentalPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Reservation history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservationsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !reservations?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No reservations yet
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium text-foreground">
                        {reservation.book.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(reservation.reservedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(reservation.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={reservation.status}
                          labels={RESERVATION_STATUS_LABELS}
                          colors={RESERVATION_STATUS_COLORS}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={reservationPage}
                total={reservations?.length ?? 0}
                limit={HISTORY_PAGE_SIZE}
                onPageChange={setReservationPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Purchase history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchasesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !purchases?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No purchases yet
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Purchased</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium text-foreground">
                        {purchase.bookCopy.book.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {CONDITION_LABELS[purchase.bookCopy.condition]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        ${purchase.price}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(purchase.purchasedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={purchasePage}
                total={purchases?.length ?? 0}
                limit={HISTORY_PAGE_SIZE}
                onPageChange={setPurchasePage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

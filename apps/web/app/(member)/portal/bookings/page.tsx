'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  User as UserIcon,
  XCircle,
  CalendarX,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMeBookings,
  useCancelMyBooking,
  MY_BOOKINGS_PAGE_SIZE,
} from '@/hooks/use-me';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import type { MeBookingResponse, BookingStatus } from '@repo/contracts';

const STATUS_COLORS: Record<string, string> = {
  BOOKED: 'bg-primary-100 text-primary-base border border-primary-200',
  CHECKED_IN: 'bg-green-100 text-green-700 border border-green-200',
  CANCELLED: 'bg-error-light text-error border border-error/20',
};

const STATUS_LABELS: Record<string, string> = {
  BOOKED: 'Booked',
  CHECKED_IN: 'Checked In',
  CANCELLED: 'Cancelled',
};

/** Render a loading skeleton for the bookings list */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}

/** Confirmation dialog for cancelling an upcoming booking */
function CancelBookingDialog({
  booking,
  onClose,
}: {
  booking: MeBookingResponse | null;
  onClose: () => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const { cancelBooking } = useCancelMyBooking();

  /** Handle the confirm cancellation click */
  const handleCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      await cancelBooking(booking.id);
      toast.success('Booking cancelled successfully');
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to cancel booking',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            Cancel Class Booking
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm text-gray-600">
            Are you sure you want to cancel your registration for{' '}
            <strong className="text-gray-900">{booking?.session.title}</strong>?
            This will free up your spot for other members.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isCancelling}>
            Keep My Spot
          </Button>
          <Button
            className="bg-error hover:bg-error/90 text-white"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling…' : 'Cancel Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Render an individual booking card with session timing, instructor, and cancellation control */
function BookingCard({
  booking,
  onCancel,
}: {
  booking: MeBookingResponse;
  onCancel: (b: MeBookingResponse) => void;
}) {
  const session = booking.session;
  const startsAt = new Date(session.startsAt);
  const endsAt = new Date(session.endsAt);
  const durationMin = Math.round(
    (endsAt.getTime() - startsAt.getTime()) / 60000,
  );
  const isUpcoming = startsAt > new Date() && booking.status === 'BOOKED';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300">
      <div className="space-y-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {session.title}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
        </div>

        {session.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {session.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-gray-500 pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary-base" />
            <span className="font-medium text-gray-700">
              {format(startsAt, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary-base" />
            <span>
              {format(startsAt, 'h:mm a')} — {format(endsAt, 'h:mm a')} (
              {durationMin} min)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <UserIcon className="h-4 w-4 text-primary-base" />
            <span>
              {session.instructor?.name ?? (
                <span className="italic text-gray-400">Unassigned Trainer</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {isUpcoming && (
        <div className="flex sm:flex-col justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(booking)}
            className="border-error/30 text-error hover:bg-error-light hover:border-error/50 transition-colors"
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Cancel Booking
          </Button>
        </div>
      )}
    </div>
  );
}

/** Render empty state message based on current status filter */
function EmptyState({ filter }: { filter: string }) {
  const messages: Record<string, { title: string; desc: string }> = {
    ALL: {
      title: 'No session bookings yet',
      desc: 'Explore your gym’s schedule to find and register for upcoming classes!',
    },
    BOOKED: {
      title: 'No upcoming booked sessions',
      desc: 'You have no active class registrations at this time.',
    },
    CHECKED_IN: {
      title: 'No checked-in sessions',
      desc: 'You haven’t checked in to any classes yet.',
    },
    CANCELLED: {
      title: 'No cancelled bookings',
      desc: 'You have no cancelled session registrations.',
    },
  };

  const defaultMsg = {
    title: 'No session bookings yet',
    desc: 'Explore your gym’s schedule to find and register for upcoming classes!',
  };
  const activeMsg = messages[filter] || messages.ALL || defaultMsg;

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
      <CalendarX className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 text-base font-semibold text-gray-800">
        {activeMsg.title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
        {activeMsg.desc}
      </p>
    </div>
  );
}

/** Member portal page displaying paginated, status-filtered bookings */
export default function MyBookingsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cancellingBooking, setCancellingBooking] =
    useState<MeBookingResponse | null>(null);

  const activeStatus =
    statusFilter === 'ALL' ? undefined : (statusFilter as BookingStatus);

  const { bookings, total, isLoading, error } = useMeBookings({
    page,
    status: activeStatus,
  });

  const totalPages = Math.max(
    1,
    Math.ceil((total ?? 0) / MY_BOOKINGS_PAGE_SIZE),
  );

  /** Handle filter tab change and reset page to 1 */
  function handleFilterChange(newStatus: string) {
    setStatusFilter(newStatus);
    setPage(1);
  }

  const filterTabs = [
    { id: 'ALL', label: 'All Bookings' },
    { id: 'BOOKED', label: 'Booked' },
    { id: 'CHECKED_IN', label: 'Checked In' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your scheduled classes, timing, and instructor assignments.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {filterTabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-base text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-base hover:text-primary-base'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0 space-y-4">
          {isLoading && <LoadingSkeleton />}

          {!isLoading && error && (
            <div className="rounded-xl border border-error/20 bg-error-light py-8 text-center text-sm text-error font-medium">
              Failed to load bookings. Please refresh the page.
            </div>
          )}

          {!isLoading && !error && (!bookings || bookings.length === 0) && (
            <EmptyState filter={statusFilter} />
          )}

          {!isLoading && !error && bookings && bookings.length > 0 && (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={(b) => setCancellingBooking(b)}
                />
              ))}
            </div>
          )}

          {/* Pagination controls */}
          {!isLoading && !error && total !== undefined && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-5 mt-6">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * MY_BOOKINGS_PAGE_SIZE + 1}–
                {Math.min(page * MY_BOOKINGS_PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium text-gray-700 px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <CancelBookingDialog
        booking={cancellingBooking}
        onClose={() => setCancellingBooking(null)}
      />
    </div>
  );
}

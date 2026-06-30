'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  BookingListResponse,
  BookingResponse,
  BookingCreateRequest,
} from '@repo/contracts';

/** Return value of useBookings — bookings list for a session + loading state */
interface UseBookingsReturn {
  bookings: BookingListResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch all bookings for a specific session */
export function useBookings(
  sessionId: string | undefined,
  options: { enabled?: boolean } = {},
): UseBookingsReturn {
  const { enabled = true } = options;
  const endpoint = sessionId ? `/bookings?sessionId=${sessionId}` : null;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<BookingListResponse>(enabled && endpoint ? endpoint : null);

  return {
    bookings: data,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/** Create a booking and invalidate bookings + sessions caches */
export function useCreateBooking() {
  /** Book a member into a session, then revalidate both bookings and session data */
  const createBooking = useCallback(async (dto: BookingCreateRequest) => {
    const result = await apiPost<BookingResponse>('/bookings', dto);
    // Invalidate bookings list for this session
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/bookings'),
      undefined,
      { revalidate: true },
    );
    // Also invalidate sessions since _count.bookings changed
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/sessions'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { createBooking };
}

/** Cancel a booking and invalidate caches */
export function useCancelBooking() {
  /** Cancel the specified booking, then revalidate bookings and session data */
  const cancelBooking = useCallback(async (bookingId: string) => {
    const result = await apiPatch<BookingResponse>(
      `/bookings/${bookingId}/cancel`,
      {},
    );
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/bookings'),
      undefined,
      { revalidate: true },
    );
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/sessions'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { cancelBooking };
}

/** Check in a booked member and invalidate caches */
export function useCheckInBooking() {
  /** Check in the specified booking, then revalidate bookings and session data */
  const checkInBooking = useCallback(async (bookingId: string) => {
    const result = await apiPatch<BookingResponse>(
      `/bookings/${bookingId}/check-in`,
      {},
    );
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/bookings'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { checkInBooking };
}

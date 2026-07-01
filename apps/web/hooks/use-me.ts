'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type {
  MeProfileResponse,
  SubscriptionListResponse,
  PlanListResponse,
  MeBookingListResponse,
  MeBookingResponse,
  BookingStatus,
} from '@repo/contracts';

export const MY_BOOKINGS_PAGE_SIZE = 25;

/** Fetch the logged-in member's profile from the portal API */
export function useMeProfile() {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<MeProfileResponse>('/me/profile');

  return {
    profile: data,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/** Fetch the logged-in member's subscriptions */
export function useMeSubscriptions() {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<SubscriptionListResponse>('/me/subscriptions');

  return {
    subscriptions: data?.subscriptions,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/** Fetch the active plan catalog available in the member's gym */
export function useMePlans() {
  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<PlanListResponse>('/me/plans');

  return {
    plans: data?.plans,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

interface UseMeBookingsOptions {
  page?: number;
  status?: BookingStatus;
  enabled?: boolean;
}

/** Fetch paginated list of bookings for the logged-in portal member */
export function useMeBookings(options: UseMeBookingsOptions = {}) {
  const { page = 1, status, enabled = true } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(MY_BOOKINGS_PAGE_SIZE),
  });
  if (status) {
    params.set('status', status);
  }
  const endpoint = `/me/bookings?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<MeBookingListResponse>(enabled ? endpoint : null);

  return {
    bookings: data?.bookings,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/** Expose a cancel action for one of the logged-in member's upcoming bookings */
export function useCancelMyBooking() {
  const cancelBooking = useCallback(async (id: string) => {
    const result = await apiPatch<MeBookingResponse>(
      `/me/bookings/${id}/cancel`,
    );
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/me/bookings'),
      undefined,
      { revalidate: true },
    );
    return result;
  }, []);

  return { cancelBooking };
}

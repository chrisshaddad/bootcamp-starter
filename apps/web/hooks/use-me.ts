'use client';

import useSWR from 'swr';
import type {
  MeProfileResponse,
  SubscriptionListResponse,
  PlanListResponse,
} from '@repo/contracts';

/** Fetch the logged-in member's profile from the portal API */
export function useMeProfile() {
  const { data, error, isLoading, mutate } =
    useSWR<MeProfileResponse>('/me/profile');

  return {
    profile: data,
    isLoading,
    error,
    mutate,
  };
}

/** Fetch the logged-in member's subscriptions */
export function useMeSubscriptions() {
  const { data, error, isLoading, mutate } =
    useSWR<SubscriptionListResponse>('/me/subscriptions');

  return {
    subscriptions: data?.subscriptions,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/** Fetch the active plan catalog available in the member's gym */
export function useMePlans() {
  const { data, error, isLoading, mutate } =
    useSWR<PlanListResponse>('/me/plans');

  return {
    plans: data?.plans,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

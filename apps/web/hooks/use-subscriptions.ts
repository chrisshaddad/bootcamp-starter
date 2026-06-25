'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import type {
  SubscriptionListResponse,
  SubscriptionResponse,
  SubscriptionCreateRequest,
  SubscriptionStatus,
} from '@repo/contracts';

export const SUBSCRIPTIONS_PAGE_SIZE = 25;

interface UseSubscriptionsOptions {
  page?: number;
  status?: SubscriptionStatus;
  enabled?: boolean;
}

interface UseSubscriptionsReturn {
  subscriptions: SubscriptionListResponse['subscriptions'] | undefined;
  total: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/** Fetch the paginated subscription history for a member */
export function useSubscriptions(
  memberId: string,
  options: UseSubscriptionsOptions = {},
): UseSubscriptionsReturn {
  const { page = 1, status, enabled = true } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(SUBSCRIPTIONS_PAGE_SIZE),
  });
  if (status) params.set('status', status);
  const endpoint = `/members/${memberId}/subscriptions?${params.toString()}`;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<SubscriptionListResponse>(enabled && memberId ? endpoint : null);

  return {
    subscriptions: data?.subscriptions,
    total: data?.total,
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/** Create a new subscription and invalidate the member's subscription list */
export function useCreateSubscription(memberId: string) {
  const invalidate = useCallback(() => {
    mutate(
      (key) =>
        typeof key === 'string' &&
        key.startsWith(`/members/${memberId}/subscriptions`),
      undefined,
      { revalidate: true },
    );
  }, [memberId]);

  const create = useCallback(
    async (dto: SubscriptionCreateRequest) => {
      const result = await apiPost<SubscriptionResponse>('/subscriptions', dto);
      invalidate();
      return result;
    },
    [invalidate],
  );

  return { create };
}

/** Cancel a subscription and invalidate the member's subscription list */
export function useCancelSubscription(memberId: string) {
  const invalidate = useCallback(() => {
    mutate(
      (key) =>
        typeof key === 'string' &&
        key.startsWith(`/members/${memberId}/subscriptions`),
      undefined,
      { revalidate: true },
    );
  }, [memberId]);

  const cancel = useCallback(
    async (subscriptionId: string) => {
      const result = await apiPatch<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}/cancel`,
        {},
      );
      invalidate();
      return result;
    },
    [invalidate],
  );

  return { cancel };
}

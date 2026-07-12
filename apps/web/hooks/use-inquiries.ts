'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  InquiryDetailResponse,
  InquiryListResponse,
  InquiryReplyRequest,
  InquiryStatus,
  InquiryStatusUpdateRequest,
} from '@repo/contracts';

interface UseInquiriesOptions {
  status?: InquiryStatus;
  enabled?: boolean;
}

/**
 * The officer's branch inquiry queue. The API always scopes the result to the
 * caller's own pharmacy + branch (from the session); `status` just narrows to
 * one tab. Counts always cover the whole queue so the tab badges stay accurate.
 */
export function useInquiries(options: UseInquiriesOptions = {}) {
  const { status, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const query = params.toString();
  const endpoint = query ? `/inquiries?${query}` : '/inquiries';

  const { data, error, isLoading, mutate } = useSWR<InquiryListResponse>(
    enabled ? endpoint : null,
  );

  return {
    branchName: data?.branchName,
    inquiries: data?.inquiries,
    total: data?.total,
    counts: data?.counts,
    isLoading,
    error,
    mutate,
  };
}

// The open thread shows live medicine details + branch stock, so it polls and
// revalidates aggressively (the global SWR config disables focus revalidation;
// re-enable it here) — a catalog price change or a new stock batch surfaces
// within one interval without a manual reload.
const INQUIRY_DETAIL_REFRESH_MS = 10_000;

/** Full thread + context panel for one inquiry, kept fresh in near real time. */
export function useInquiryDetail(id: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<InquiryDetailResponse>(
    enabled ? `/inquiries/${id}` : null,
    {
      refreshInterval: INQUIRY_DETAIL_REFRESH_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
  return { inquiry: data, isLoading, error, mutate };
}

/**
 * Mutations for the inquiry console. Revalidates every cached `/inquiries` key
 * (all queue tabs plus the open thread) after a write so the queue ordering,
 * tab counts, and thread all refresh together.
 */
export function useInquiryActions() {
  const revalidate = useCallback(
    () =>
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/inquiries'),
      ),
    [],
  );

  const reply = useCallback(
    async (
      id: string,
      data: InquiryReplyRequest,
    ): Promise<InquiryDetailResponse> => {
      const result = await apiPost<InquiryDetailResponse>(
        `/inquiries/${id}/messages`,
        data,
      );
      await revalidate();
      return result;
    },
    [revalidate],
  );

  const updateStatus = useCallback(
    async (
      id: string,
      data: InquiryStatusUpdateRequest,
    ): Promise<InquiryDetailResponse> => {
      const result = await apiPatch<InquiryDetailResponse>(
        `/inquiries/${id}/status`,
        data,
      );
      await revalidate();
      return result;
    },
    [revalidate],
  );

  return { reply, updateStatus };
}

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { apiPatch, apiPost } from '@/lib/api';
import type {
  ClientInquiryCreateRequest,
  ClientInquiryDetailResponse,
  ClientInquiryListResponse,
  ClientInquiryStatusRequest,
  InquiryReplyRequest,
  InquiryStatus,
} from '@repo/contracts';

// The open thread polls so a pharmacy reply surfaces without a manual refresh
// (the global SWR config disables focus revalidation; re-enable it here).
const INQUIRY_DETAIL_REFRESH_MS = 10_000;

/**
 * The caller's own inquiries (GET /my/inquiries). The API always scopes to the
 * session client; `status` just narrows to one tab, and `counts` always spans
 * the whole set so the tab badges stay accurate.
 */
export function useMyInquiries(status?: InquiryStatus) {
  const endpoint = status ? `/my/inquiries?status=${status}` : '/my/inquiries';
  const { data, error, isLoading, mutate } =
    useSWR<ClientInquiryListResponse>(endpoint);

  return {
    inquiries: data?.inquiries,
    counts: data?.counts,
    total: data?.total,
    isLoading,
    error,
    mutate,
  };
}

/** One of the caller's inquiries — the thread + context, kept fresh by polling. */
export function useMyInquiryDetail(id: string | undefined) {
  const { data, error, isLoading, mutate } =
    useSWR<ClientInquiryDetailResponse>(id ? `/my/inquiries/${id}` : null, {
      refreshInterval: INQUIRY_DETAIL_REFRESH_MS,
      revalidateOnFocus: true,
    });

  return { inquiry: data, isLoading, error, mutate };
}

/**
 * Mutations for the client inquiry flow. Revalidates every cached
 * `/my/inquiries` query after a write so the list + badges stay in sync.
 */
export function useMyInquiryActions() {
  const revalidateLists = useCallback(
    () =>
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/my/inquiries'),
      ),
    [],
  );

  const createInquiry = useCallback(
    async (
      data: ClientInquiryCreateRequest,
    ): Promise<ClientInquiryDetailResponse> => {
      const result = await apiPost<ClientInquiryDetailResponse>(
        '/my/inquiries',
        data,
      );
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const sendMessage = useCallback(
    async (
      id: string,
      data: InquiryReplyRequest,
    ): Promise<ClientInquiryDetailResponse> => {
      const result = await apiPost<ClientInquiryDetailResponse>(
        `/my/inquiries/${id}/messages`,
        data,
      );
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  const updateStatus = useCallback(
    async (
      id: string,
      data: ClientInquiryStatusRequest,
    ): Promise<ClientInquiryDetailResponse> => {
      const result = await apiPatch<ClientInquiryDetailResponse>(
        `/my/inquiries/${id}/status`,
        data,
      );
      await revalidateLists();
      return result;
    },
    [revalidateLists],
  );

  return { createInquiry, sendMessage, updateStatus };
}

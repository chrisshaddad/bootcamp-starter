'use client';

import useSWR from 'swr';
import type { BookListResponse, BookResponse } from '@repo/contracts';

interface UsePortalBooksOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for browsing the active library's catalog (patron self-service).
 */
export function usePortalBooks(options: UsePortalBooksOptions = {}) {
  const { page = 1, limit = 20, enabled = true } = options;

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const endpoint = `/portal/books?${params.toString()}`;

  const { data, error, isLoading } = useSWR<BookListResponse>(
    enabled ? endpoint : null,
  );

  return {
    books: data?.books,
    total: data?.total,
    isLoading,
    error,
  };
}

export function usePortalBook(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading } = useSWR<BookResponse>(
    enabled ? `/portal/books/${id}` : null,
  );

  return {
    book: data,
    isLoading,
    error,
  };
}

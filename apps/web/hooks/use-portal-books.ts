'use client';

import useSWR from 'swr';
import type { BookListResponse, BookResponse } from '@repo/contracts';

interface UsePortalBooksOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  authorId?: string;
  enabled?: boolean;
}

/**
 * Hook for browsing the active library's catalog (patron self-service).
 * Filters are applied server-side, so they cover the full catalog rather
 * than just the currently loaded page.
 */
export function usePortalBooks(options: UsePortalBooksOptions = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    categoryId,
    authorId,
    enabled = true,
  } = options;

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (categoryId) params.set('categoryId', categoryId);
  if (authorId) params.set('authorId', authorId);
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

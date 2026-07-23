'use client';

import useSWR from 'swr';
import type { BookCopyListResponse } from '@repo/contracts';

/**
 * Hook for a book's copies within the active library (used on the book
 * detail page to show availability before placing a hold).
 */
export function usePortalBookCopies(
  bookId: string,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const endpoint = `/portal/book-copies?bookId=${bookId}&limit=50`;

  const { data, error, isLoading } = useSWR<BookCopyListResponse>(
    enabled ? endpoint : null,
  );

  return {
    bookCopies: data?.bookCopies,
    total: data?.total,
    isLoading,
    error,
  };
}

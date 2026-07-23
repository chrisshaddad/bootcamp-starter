'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  BookCopyListResponse,
  BookCopyResponse,
  BookCopyCreateRequest,
  BookCopyUpdateRequest,
  BookCopyStatus,
} from '@repo/contracts';

const PREFIX = '/book-copies';

// A copy's status/existence changes the owning book's availableCopies count,
// which is embedded in the book list/detail responses on both sides - so
// every mutation here has to invalidate those caches too, not just this
// endpoint's own list, or a book can sit showing stale "Unavailable" after
// staff add/return/remove stock until something else happens to refetch it.
async function invalidateBookCopyEffects() {
  await Promise.all([
    invalidateByPrefix(PREFIX),
    invalidateByPrefix('/books'),
    invalidateByPrefix('/portal/books'),
  ]);
}

interface UseBookCopiesOptions {
  bookId?: string;
  page?: number;
  limit?: number;
  status?: BookCopyStatus;
  search?: string;
  enabled?: boolean;
}

/**
 * List + mutations hook for book copies (tenant-scoped by the API). Typically
 * scoped to a single book via `bookId` on the book detail page.
 */
export function useBookCopies(options: UseBookCopiesOptions = {}) {
  const {
    bookId,
    page = 1,
    limit = 20,
    status,
    search,
    enabled = true,
  } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (bookId) params.set('bookId', bookId);
  if (status) params.set('status', status);
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<BookCopyListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  const create = useCallback(async (body: BookCopyCreateRequest) => {
    const res = await apiPost<BookCopyResponse>(PREFIX, body);
    await invalidateBookCopyEffects();
    return res;
  }, []);

  const update = useCallback(
    async (id: string, body: BookCopyUpdateRequest) => {
      const res = await apiPatch<BookCopyResponse>(`${PREFIX}/${id}`, body);
      await invalidateBookCopyEffects();
      return res;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await apiDelete(`${PREFIX}/${id}`);
    await invalidateBookCopyEffects();
  }, []);

  return {
    bookCopies: data?.bookCopies,
    total: data?.total,
    isLoading,
    error,
    mutate,
    create,
    update,
    remove,
  };
}

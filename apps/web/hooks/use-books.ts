'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';
import { invalidateByPrefix } from '@/lib/swr';
import { useCurrentOrg } from '@/hooks/use-current-org';
import type {
  BookListResponse,
  BookResponse,
  BookCreateRequest,
  BookUpdateRequest,
} from '@repo/contracts';

const PREFIX = '/books';

interface UseBooksOptions {
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}

/**
 * List + mutations hook for books (tenant-scoped by the API). The list items
 * embed publisher/authors/categories summaries, so no extra fetch is needed to
 * render them.
 */
export function useBooks(options: UseBooksOptions = {}) {
  const { page = 1, limit = 20, search, enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const trimmed = search?.trim();
  if (trimmed) params.set('search', trimmed);
  const endpoint = `${PREFIX}?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<BookListResponse>(
    isStaff && enabled ? endpoint : null,
  );

  const create = useCallback(async (body: BookCreateRequest) => {
    const res = await apiPost<BookResponse>(PREFIX, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const update = useCallback(async (id: string, body: BookUpdateRequest) => {
    const res = await apiPatch<BookResponse>(`${PREFIX}/${id}`, body);
    await invalidateByPrefix(PREFIX);
    return res;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(`${PREFIX}/${id}`);
    await invalidateByPrefix(PREFIX);
  }, []);

  return {
    books: data?.books,
    total: data?.total,
    isLoading,
    error,
    mutate,
    create,
    update,
    remove,
  };
}

/**
 * Single book fetch for the detail page.
 */
export function useBook(id: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { isStaff } = useCurrentOrg();

  const { data, error, isLoading, mutate } = useSWR<BookResponse>(
    isStaff && enabled && id ? `${PREFIX}/${id}` : null,
  );

  return { book: data, isLoading, error, mutate };
}

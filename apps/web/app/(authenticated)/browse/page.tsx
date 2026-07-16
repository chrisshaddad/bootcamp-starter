'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/use-auth';
import { usePortalBooks } from '@/hooks/use-portal-books';
import { usePortalCategories } from '@/hooks/use-portal-categories';
import { usePortalAuthors } from '@/hooks/use-portal-authors';
import { useDebounce } from '@/hooks/use-debounce';
import { BookCard } from '@/components/book-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Search } from 'lucide-react';

const ALL_FILTER_VALUE = 'all';

export default function BrowsePage() {
  const { user, isLoading: userLoading } = useUser();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [authorId, setAuthorId] = useState<string | undefined>();
  const debouncedSearch = useDebounce(search, 300);

  const hasActiveLibrary = !!user?.activeOrganizationId;

  const { books, total, isLoading, error } = usePortalBooks({
    limit: 60,
    search: debouncedSearch,
    categoryId,
    authorId,
    enabled: hasActiveLibrary,
  });
  const { categories } = usePortalCategories({ enabled: hasActiveLibrary });
  const { authors } = usePortalAuthors({ enabled: hasActiveLibrary });

  if (userLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!hasActiveLibrary) {
    return (
      <div className="py-20 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/60" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Select a library first
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Activate one of your approved libraries to browse its catalog.
        </p>
        <a
          href="/my-libraries"
          className="mt-4 inline-block text-sm text-library-primary hover:underline"
        >
          Go to My Libraries
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Browse Books</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore the catalog, reserve a copy, or buy one to keep
            {total !== undefined && ` — ${total} titles`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles..."
              className="w-56 pl-9"
              aria-label="Search books by title"
            />
          </div>

          <Select
            value={categoryId ?? ALL_FILTER_VALUE}
            onValueChange={(value) =>
              setCategoryId(value === ALL_FILTER_VALUE ? undefined : value)
            }
          >
            <SelectTrigger className="w-44" aria-label="Filter by category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={authorId ?? ALL_FILTER_VALUE}
            onValueChange={(value) =>
              setAuthorId(value === ALL_FILTER_VALUE ? undefined : value)
            }
          >
            <SelectTrigger className="w-44" aria-label="Filter by author">
              <SelectValue placeholder="All Authors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All Authors</SelectItem>
              {authors?.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-error">
          Failed to load the catalog
        </div>
      ) : !books?.length ? (
        <div className="py-20 text-center text-muted-foreground">
          No books match your filters
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

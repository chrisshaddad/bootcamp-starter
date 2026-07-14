'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { usePortalBooks } from '@/hooks/use-portal-books';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { BookOpen, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export default function BrowsePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const hasActiveLibrary = !!user?.activeOrganizationId;

  const { books, total, isLoading, error } = usePortalBooks({
    enabled: hasActiveLibrary,
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Browse Books</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore the catalog and place a hold on any title
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles..."
            className="w-64 pl-9"
            aria-label="Search books by title"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Catalog
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load the catalog
            </div>
          ) : !books?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No books found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author(s)</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Publisher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books
                  .filter((book) =>
                    book.title
                      .toLowerCase()
                      .includes(debouncedSearch.toLowerCase()),
                  )
                  .map((book) => (
                    <TableRow
                      key={book.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/browse/${book.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {book.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {book.authors.map((a) => a.name).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {book.categories.map((c) => c.name).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {book.publisher?.name ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

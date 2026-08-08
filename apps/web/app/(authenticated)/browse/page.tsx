'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUser, useAuth } from '@/hooks/use-auth';
import { usePortalBooks } from '@/hooks/use-portal-books';
import { usePortalCategories } from '@/hooks/use-portal-categories';
import { usePortalAuthors } from '@/hooks/use-portal-authors';
import { usePortalMemberships } from '@/hooks/use-portal-memberships';
import { useDebounce } from '@/hooks/use-debounce';
import { invalidateByPrefix } from '@/lib/swr';
import { ApiError } from '@/lib/api';
import { BookCard } from '@/components/book-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, BookOpen, Search, Library } from 'lucide-react';

const ALL_FILTER_VALUE = 'all';

export default function BrowsePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { setActiveOrganization } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [authorId, setAuthorId] = useState<string | undefined>();
  const [isSwitching, setIsSwitching] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { memberships, isLoading: membershipsLoading } = usePortalMemberships();
  const activeMemberships = (memberships ?? []).filter(
    (m) => m.membershipStatus === 'ACTIVE',
  );
  const activeMembership = activeMemberships.find(
    (m) => m.organization.id === user?.activeOrganizationId,
  );

  const hasActiveLibrary = !!activeMembership;

  // A patron with exactly one active library shouldn't have to visit My
  // Libraries and click Activate before they can browse - skip straight to
  // their catalog. With 2+ libraries there's a real choice to make, so that
  // case still asks (see the "choose a library" screen below), just inline
  // on this page instead of a separate one.
  useEffect(() => {
    const soleMembership =
      activeMemberships.length === 1 ? activeMemberships[0] : undefined;

    if (
      !userLoading &&
      !membershipsLoading &&
      !hasActiveLibrary &&
      soleMembership
    ) {
      setActiveOrganization({
        organizationId: soleMembership.organization.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, membershipsLoading, hasActiveLibrary]);

  const handleSwitchLibrary = async (organizationId: string) => {
    setIsSwitching(true);
    try {
      await setActiveOrganization({ organizationId });
      // The active org lives in the session, not the /portal/books query
      // string, so switching doesn't change any SWR key - force a
      // revalidation of everything scoped to the active library.
      await invalidateByPrefix('/portal/');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to switch library',
      );
    } finally {
      setIsSwitching(false);
    }
  };

  const { books, total, isLoading, error } = usePortalBooks({
    limit: 60,
    search: debouncedSearch,
    categoryId,
    authorId,
    enabled: hasActiveLibrary,
  });
  const { categories } = usePortalCategories({ enabled: hasActiveLibrary });
  const { authors } = usePortalAuthors({ enabled: hasActiveLibrary });

  if (userLoading || membershipsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 gap-2"
      onClick={() => router.push('/my-libraries')}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to My Libraries
    </Button>
  );

  if (activeMemberships.length === 0) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="py-20 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            No active library memberships yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Join a library to start browsing its catalog.
          </p>
          <a
            href="/discover"
            className="mt-4 inline-block text-sm text-library-primary hover:underline"
          >
            Discover libraries
          </a>
        </div>
      </div>
    );
  }

  if (!hasActiveLibrary) {
    return (
      <div className="space-y-6">
        {backButton}
        <div className="py-20 text-center">
          <Library className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Choose a library to browse
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You belong to {activeMemberships.length} libraries - pick one to see
            its catalog.
          </p>
          <div className="mx-auto mt-4 flex max-w-xs flex-col gap-2">
            {activeMemberships.map((membership) => (
              <Button
                key={membership.organization.id}
                variant="outline"
                disabled={isSwitching}
                onClick={() => handleSwitchLibrary(membership.organization.id)}
              >
                {membership.organization.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeLibraryName = activeMembership?.organization.name;

  return (
    <div className="space-y-6">
      {backButton}
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

          {activeMemberships.length > 1 && (
            <Select
              value={user?.activeOrganizationId ?? undefined}
              onValueChange={handleSwitchLibrary}
              disabled={isSwitching}
            >
              <SelectTrigger className="w-48" aria-label="Switch library">
                <Library className="h-4 w-4" />
                <SelectValue>{activeLibraryName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeMemberships.map((membership) => (
                  <SelectItem
                    key={membership.organization.id}
                    value={membership.organization.id}
                  >
                    {membership.organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

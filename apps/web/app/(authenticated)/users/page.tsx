'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Search, Users } from 'lucide-react';
import { fetcher, ApiError } from '@/lib/api';
import { useUser } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExploreUsersResponse } from '@repo/contracts';

export default function ExploreUsersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useUser();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 1. Role Guard: Redirect standard developers to the dashboard
  useEffect(() => {
    if (
      !isAuthLoading &&
      user &&
      user.accountType !== 'HIRING' &&
      user.accountType !== 'SUPER_ADMIN'
    ) {
      router.replace('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  // Simple debounce for the search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Only fetch users if authorized
  const isAuthorized =
    user?.accountType === 'HIRING' || user?.accountType === 'SUPER_ADMIN';
  const {
    data,
    error,
    isLoading: isDataLoading,
  } = useSWR<ExploreUsersResponse, ApiError>(
    isAuthorized
      ? `/users/explore?page=1&limit=20${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`
      : null,
    fetcher,
  );

  // Render Skeleton while checking authorization or loading data
  if (isAuthLoading || (isAuthorized && isDataLoading)) {
    return (
      <div className="container mx-auto py-8 max-w-7xl space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Prevent UI flash if user is not authorized
  if (!user || !isAuthorized) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Developers</h1>
          <p className="text-muted-foreground mt-1">
            Discover talented developers and explore their portfolios.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or profession..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <Card className="flex flex-col items-center py-16 text-center border-dashed">
          <p className="font-semibold">Unable to load developers</p>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            {error instanceof ApiError
              ? error.message
              : 'Something went wrong.'}
          </p>
        </Card>
      ) : data?.data?.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center border-dashed">
          <Users className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No developers found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            We couldn&apos;t find any developers matching your search criteria.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data?.data?.map((u) => {
            const profile = u.developerProfile;
            if (!profile) return null;

            return (
              <Link key={u.id} href={`/developers/${profile.publicSlug}`}>
                <Card className="hover:border-primary/50 transition-colors h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <Avatar className="h-24 w-24 border-2">
                      <AvatarImage
                        src={profile.profilePictureUrl || ''}
                        alt={profile.displayName || 'Developer avatar'}
                      />
                      <AvatarFallback className="text-xl">
                        {profile.displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h2 className="font-semibold text-lg line-clamp-1">
                        {profile.displayName || 'Unknown Developer'}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {profile.headline || 'No profession specified'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

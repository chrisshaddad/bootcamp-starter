'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth, useUser } from '@/hooks/use-auth';
import { usePortalMemberships } from '@/hooks/use-portal-memberships';
import { invalidateByPrefix } from '@/lib/swr';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Library, ArrowRight } from 'lucide-react';
import { ApiError } from '@/lib/api';

export default function MyLibrariesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { setActiveOrganization } = useAuth();
  const { memberships, isLoading, error } = usePortalMemberships();
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const activeMemberships = (memberships ?? []).filter(
    (m) => m.membershipStatus === 'ACTIVE',
  );

  const handleEnter = async (organizationId: string) => {
    if (organizationId === user?.activeOrganizationId) {
      router.push('/browse');
      return;
    }

    setEnteringId(organizationId);
    try {
      await setActiveOrganization({ organizationId });
      await invalidateByPrefix('/portal/');
      router.push('/browse');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to open this library',
      );
      setEnteringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Libraries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a library to start browsing its catalog
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-error">
          Failed to load your libraries
        </div>
      ) : !activeMemberships.length ? (
        <div className="py-10 text-center text-muted-foreground">
          You don&apos;t have any active library memberships yet.{' '}
          <a href="/discover" className="text-library-primary hover:underline">
            Discover libraries
          </a>{' '}
          or check{' '}
          <a
            href="/my-memberships"
            className="text-library-primary hover:underline"
          >
            your pending requests
          </a>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeMemberships.map((membership) => {
            const isActiveHere =
              user?.activeOrganizationId === membership.organizationId;
            const isEntering = enteringId === membership.organizationId;

            return (
              <button
                key={membership.id}
                type="button"
                disabled={isEntering}
                onClick={() => handleEnter(membership.organizationId)}
                className="w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 py-6">
                    <Library className="h-8 w-8 shrink-0 text-library-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">
                        {membership.organization.name}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        {isEntering
                          ? 'Opening...'
                          : `Card #${membership.libraryCardNumber}`}
                      </div>
                      {isActiveHere && (
                        <Badge
                          variant="outline"
                          className="mt-1.5 bg-success-light text-xs text-success-dark"
                        >
                          Currently browsing
                        </Badge>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

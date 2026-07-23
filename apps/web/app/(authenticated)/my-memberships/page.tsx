'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { usePortalMemberships } from '@/hooks/use-portal-memberships';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { Library, Compass } from 'lucide-react';
import { ApiError } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending Approval',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success-light text-success-dark',
  PENDING: 'bg-warning-light text-warning-dark',
  EXPIRED: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-library-accent-100 text-library-accent-800',
  CANCELLED: 'bg-error-light text-error',
};

export default function MyMembershipsPage() {
  const { memberships, isLoading, error, deactivateMembership } =
    usePortalMemberships();
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const handleDeactivate = async (membershipId: string) => {
    setDeactivatingId(membershipId);
    try {
      await deactivateMembership(membershipId);
      toast.success('Membership deactivated');
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'Failed to deactivate membership',
      );
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Memberships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Libraries you&apos;ve requested to join, and their status
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/discover">
            <Compass className="h-4 w-4" />
            Discover Libraries
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-error">
          Failed to load your memberships
        </div>
      ) : !memberships?.length ? (
        <div className="py-10 text-center text-muted-foreground">
          You haven&apos;t requested to join any libraries yet.{' '}
          <Link
            href="/discover"
            className="text-library-primary hover:underline"
          >
            Discover libraries
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map((membership) => (
            <Card key={membership.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Library className="h-8 w-8 shrink-0 text-library-primary" />
                  <div>
                    <div className="font-medium text-foreground">
                      {membership.organization.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Card #{membership.libraryCardNumber}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge
                    status={membership.membershipStatus}
                    labels={STATUS_LABELS}
                    colors={STATUS_COLORS}
                  />
                  {membership.membershipStatus === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-error/30 text-error hover:bg-error-light"
                      disabled={deactivatingId === membership.id}
                      onClick={() => handleDeactivate(membership.id)}
                    >
                      {deactivatingId === membership.id
                        ? 'Deactivating...'
                        : 'Deactivate'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

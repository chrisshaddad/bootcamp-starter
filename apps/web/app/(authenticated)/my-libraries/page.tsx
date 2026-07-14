'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUser, useAuth } from '@/hooks/use-auth';
import { usePortalMemberships } from '@/hooks/use-portal-memberships';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { Library } from 'lucide-react';
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

export default function MyLibrariesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { setActiveOrganization } = useAuth();
  const { memberships, isLoading, error } = usePortalMemberships();
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const handleActivate = async (organizationId: string) => {
    setActivatingId(organizationId);
    try {
      await setActiveOrganization({ organizationId });
      toast.success('Library activated');
      router.push('/browse');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to activate library');
      }
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Libraries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Libraries you&apos;ve requested to join, and their status
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-error">
          Failed to load your libraries
        </div>
      ) : !memberships?.length ? (
        <div className="py-10 text-center text-muted-foreground">
          You haven&apos;t requested to join any libraries yet.{' '}
          <a href="/discover" className="text-library-primary hover:underline">
            Discover libraries
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map((membership) => {
            const isActiveHere =
              user?.activeOrganizationId === membership.organizationId;

            return (
              <Card key={membership.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <Library className="h-8 w-8 text-library-primary" />
                    <div>
                      <div className="font-medium text-foreground">
                        {membership.organization.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Card #{membership.libraryCardNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={membership.membershipStatus}
                      labels={STATUS_LABELS}
                      colors={STATUS_COLORS}
                    />
                    {membership.membershipStatus === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant={isActiveHere ? 'outline' : 'default'}
                        disabled={
                          isActiveHere ||
                          activatingId === membership.organizationId
                        }
                        onClick={() =>
                          handleActivate(membership.organizationId)
                        }
                      >
                        {isActiveHere
                          ? 'Currently Active'
                          : activatingId === membership.organizationId
                            ? 'Activating...'
                            : 'Activate'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

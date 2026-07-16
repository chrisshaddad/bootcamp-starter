'use client';

import { useUser } from '@/hooks/use-auth';
import { usePortalMemberships } from '@/hooks/use-portal-memberships';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { Settings, User, Library } from 'lucide-react';

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

function PatronSettings() {
  const { user, isLoading: userLoading } = useUser();
  const { memberships, isLoading: membershipsLoading } = usePortalMemberships();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <User className="h-5 w-5 text-muted-foreground" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">{user?.email}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Library className="h-5 w-5 text-muted-foreground" />
            My Libraries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membershipsLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !memberships?.length ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t joined any libraries yet.
            </p>
          ) : (
            <div className="space-y-2">
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {membership.organization.name}
                    </div>
                    <div className="text-muted-foreground">
                      Card #{membership.libraryCardNumber} &middot;{' '}
                      {membership.membershipType}
                    </div>
                  </div>
                  <StatusBadge
                    status={membership.membershipStatus}
                    labels={STATUS_LABELS}
                    colors={STATUS_COLORS}
                  />
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            To deactivate a membership, visit{' '}
            <a
              href="/my-libraries"
              className="text-library-primary hover:underline"
            >
              My Libraries
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffSettingsStub() {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Settings className="h-5 w-5 text-muted-foreground" />
          Account Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-75 flex-col items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Coming Soon</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Settings features are being developed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const isPatron = user?.role === 'MEMBER';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPatron
            ? 'Your profile and library memberships'
            : 'Manage your account and organization settings'}
        </p>
      </div>

      {isPatron ? <PatronSettings /> : <StaffSettingsStub />}
    </div>
  );
}

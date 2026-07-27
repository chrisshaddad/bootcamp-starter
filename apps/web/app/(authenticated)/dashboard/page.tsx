'use client';

import { AlertCircle } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import {
  useDashboardSummary,
  usePortalDashboardSummary,
  useOrganizationSummary,
} from '@/hooks/use-dashboard';
import { StaffDashboard } from '@/components/dashboard/staff-dashboard';
import { PatronDashboard } from '@/components/dashboard/patron-dashboard';
import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserResponse } from '@repo/contracts';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// Without this, an error (API down, 500, etc.) leaves `summary` undefined
// forever and the page gets stuck showing LoadingSkeleton with no way out.
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
      <AlertCircle className="h-8 w-8 text-error" />
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t load your dashboard. The server may be temporarily
        unavailable.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function greetingName(user: UserResponse): string {
  return (
    user.profile?.firstName || user.name || user.email?.split('@')[0] || 'User'
  );
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser();
  const staff = useDashboardSummary();
  const patron = usePortalDashboardSummary();
  const superAdmin = useOrganizationSummary();

  if (userLoading || !user) {
    return <LoadingSkeleton />;
  }

  const body = (() => {
    if (user.role === 'ORG_ADMIN' || user.role === 'LIBRARIAN') {
      if (staff.error) {
        return <ErrorState onRetry={() => staff.mutate()} />;
      }
      return staff.summary ? (
        <StaffDashboard summary={staff.summary} />
      ) : (
        <LoadingSkeleton />
      );
    }
    if (user.role === 'MEMBER') {
      if (patron.error) {
        return <ErrorState onRetry={() => patron.mutate()} />;
      }
      return patron.summary ? (
        <PatronDashboard summary={patron.summary} />
      ) : (
        <LoadingSkeleton />
      );
    }
    if (user.role === 'SUPER_ADMIN') {
      if (superAdmin.error) {
        return <ErrorState onRetry={() => superAdmin.mutate()} />;
      }
      return superAdmin.summary ? (
        <SuperAdminDashboard summary={superAdmin.summary} />
      ) : (
        <LoadingSkeleton />
      );
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {greetingName(user)}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re signed in to NextShelf.
        </p>
      </div>

      {body}
    </div>
  );
}

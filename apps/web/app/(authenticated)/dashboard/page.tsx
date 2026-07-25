'use client';

import { useUser } from '@/hooks/use-auth';
import {
  useDashboardSummary,
  usePortalDashboardSummary,
  useOrganizationSummary,
} from '@/hooks/use-dashboard';
import { StaffDashboard } from '@/components/dashboard/staff-dashboard';
import { PatronDashboard } from '@/components/dashboard/patron-dashboard';
import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';
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
      return staff.summary ? (
        <StaffDashboard summary={staff.summary} />
      ) : (
        <LoadingSkeleton />
      );
    }
    if (user.role === 'MEMBER') {
      if (patron.error?.status === 400) {
        return (
          <p className="text-sm text-muted-foreground">
            Select a library from My Libraries to see your activity here.
          </p>
        );
      }
      return patron.summary ? (
        <PatronDashboard summary={patron.summary} />
      ) : (
        <LoadingSkeleton />
      );
    }
    if (user.role === 'SUPER_ADMIN') {
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

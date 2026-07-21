'use client';

import { useEffect, useState } from 'react';

import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-auth';
import { useSuperAdminDashboard } from '@/hooks/use-dashboard';

export default function DashboardPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isSuperAdmin = hasMounted && user?.role === 'SUPER_ADMIN';

  const {
    dashboard,
    error: dashboardError,
    isLoading: isDashboardLoading,
    mutate: refreshDashboard,
  } = useSuperAdminDashboard({
    enabled: isSuperAdmin,
  });

  const displayName =
    user?.profile?.firstName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';

  if (!hasMounted || isUserLoading) {
    return <DashboardLoading />;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-[#17223b] sm:text-2xl">
          Welcome, {isSuperAdmin ? 'Super Admin' : displayName}!
        </h1>

        <p className="mt-1 text-[11px] text-[#6d778c] sm:text-xs">
          You&apos;re signed in. Start building your project.
        </p>
      </header>

      {isSuperAdmin ? (
        <>
          {isDashboardLoading && <DashboardContentLoading />}

          {!isDashboardLoading && dashboardError && (
            <DashboardError
              message={dashboardError.message}
              onRetry={() => {
                void refreshDashboard();
              }}
            />
          )}

          {!isDashboardLoading && !dashboardError && dashboard && (
            <SuperAdminDashboard dashboard={dashboard} />
          )}
        </>
      ) : (
        user && (
          <Card className="border-[#dfe3ed] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#17223b]">
                Your Profile
              </CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-[#7b8598]">Email</dt>

                  <dd className="mt-1 text-sm text-[#17223b]">{user.email}</dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-[#7b8598]">Role</dt>

                  <dd className="mt-1 text-sm capitalize text-[#17223b]">
                    {user.role.toLowerCase().replaceAll('_', ' ')}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <DashboardContentLoading />
    </div>
  );
}

function DashboardContentLoading() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[260px] rounded-lg" />
        <Skeleton className="h-[260px] rounded-lg" />
      </div>

      <Skeleton className="h-[150px] rounded-lg" />
      <Skeleton className="h-[270px] rounded-lg" />

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.7fr]">
        <Skeleton className="h-[180px] rounded-lg" />
        <Skeleton className="h-[180px] rounded-lg" />
      </div>
    </div>
  );
}

interface DashboardErrorProps {
  message: string;
  onRetry: () => void;
}

function DashboardError({ message, onRetry }: DashboardErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-5 py-6"
    >
      <h2 className="text-sm font-bold text-red-800">
        Dashboard data could not be loaded
      </h2>

      <p className="mt-2 text-xs text-red-700">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-[#0000FF] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0000cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

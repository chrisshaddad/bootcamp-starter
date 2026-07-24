'use client';

import { useEffect, useState } from 'react';

import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';
import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-auth';
import {
  useSuperAdminDashboard,
  useTeacherDashboard,
} from '@/hooks/use-dashboard';

export default function DashboardPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isSuperAdmin = hasMounted && user?.role === 'SUPER_ADMIN';
  const isTeacher = hasMounted && user?.role === 'ORG_ADMIN';

  const {
    dashboard: superAdminDashboard,
    error: superAdminDashboardError,
    isLoading: isSuperAdminDashboardLoading,
    mutate: refreshSuperAdminDashboard,
  } = useSuperAdminDashboard({
    enabled: isSuperAdmin,
  });

  const {
    dashboard: teacherDashboard,
    error: teacherDashboardError,
    isLoading: isTeacherDashboardLoading,
    mutate: refreshTeacherDashboard,
  } = useTeacherDashboard({
    enabled: isTeacher,
  });

  const displayName =
    user?.profile?.firstName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';

  if (!hasMounted || isUserLoading) {
    return <DashboardLoading />;
  }

  if (isSuperAdmin) {
    return (
      <div className="space-y-5">
        <DashboardHeader
          title="Welcome, Super Admin!"
          description="You're signed in. Start building your project."
        />

        {isSuperAdminDashboardLoading && <SuperAdminDashboardLoading />}

        {!isSuperAdminDashboardLoading && superAdminDashboardError && (
          <DashboardError
            message={superAdminDashboardError.message}
            onRetry={() => {
              void refreshSuperAdminDashboard();
            }}
          />
        )}

        {!isSuperAdminDashboardLoading &&
          !superAdminDashboardError &&
          superAdminDashboard && (
            <SuperAdminDashboard dashboard={superAdminDashboard} />
          )}
      </div>
    );
  }

  if (isTeacher) {
    return (
      <>
        {isTeacherDashboardLoading && <TeacherDashboardLoading />}

        {!isTeacherDashboardLoading && teacherDashboardError && (
          <div className="space-y-5">
            <DashboardHeader
              title={`Welcome back, ${displayName}!`}
              description="Here's what's happening across your courses today."
            />

            <DashboardError
              message={teacherDashboardError.message}
              onRetry={() => {
                void refreshTeacherDashboard();
              }}
            />
          </div>
        )}

        {!isTeacherDashboardLoading &&
          !teacherDashboardError &&
          teacherDashboard && (
            <TeacherDashboard
              dashboard={teacherDashboard}
              teacherName={displayName}
            />
          )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <DashboardHeader
        title={`Welcome, ${displayName}!`}
        description="You're signed in. Start building your project."
      />

      {user && (
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
      )}
    </div>
  );
}

interface DashboardHeaderProps {
  title: string;
  description: string;
}

function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <header>
      <h1 className="text-xl font-bold tracking-tight text-[#17223b] sm:text-2xl">
        {title}
      </h1>

      <p className="mt-1 text-[11px] text-[#6d778c] sm:text-xs">
        {description}
      </p>
    </header>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <SuperAdminDashboardLoading />
    </div>
  );
}

function SuperAdminDashboardLoading() {
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

function TeacherDashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <Skeleton className="h-[330px] rounded-lg" />
        <Skeleton className="h-[330px] rounded-lg" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <Skeleton className="h-[310px] rounded-lg" />
        <Skeleton className="h-[310px] rounded-lg" />
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

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowRight,
  Building2,
  GraduationCap,
  UsersRound,
  UserRoundCheck,
} from 'lucide-react';
import type {
  StudentOrganizationsResponse,
  TeacherOrganizationsResponse,
} from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';

export default function DashboardPage() {
  const { user, isLoading } = useUser();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: studentData, isLoading: isStudentStatsLoading } =
    useSWR<StudentOrganizationsResponse>(
      isSuperAdmin ? '/students/organizations' : null,
      fetcher,
    );

  const { data: teacherData, isLoading: isTeacherStatsLoading } =
    useSWR<TeacherOrganizationsResponse>(
      isSuperAdmin ? '/teachers/organizations' : null,
      fetcher,
    );

  const studentStats = useMemo(() => {
    const organizations = studentData?.organizations ?? [];

    return {
      totalStudents: organizations.reduce(
        (total, organization) => total + organization.studentCount,
        0,
      ),
      organizationCount: organizations.length,
    };
  }, [studentData]);

  const teacherStats = useMemo(() => {
    const organizations = teacherData?.organizations ?? [];

    return {
      totalTeachers: organizations.reduce(
        (total, organization) => total + organization.teacherCount,
        0,
      ),
      organizationCount: organizations.length,
    };
  }, [teacherData]);

  const isDashboardStatsLoading =
    isStudentStatsLoading || isTeacherStatsLoading;

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome,{' '}
          {user?.profile?.firstName ||
            user?.name ||
            user?.email?.split('@')[0] ||
            'User'}
          !
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;re signed in. Start building your project.
        </p>
      </div>

      {isSuperAdmin && (
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href="/students"
            className="group block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            <Card className="h-full rounded-3xl border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="p-0">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                    <GraduationCap className="h-7 w-7 text-emerald-700" />
                  </div>

                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Students
                    </CardTitle>
                    <p className="mt-1 max-w-xs text-sm font-medium leading-6 text-gray-600">
                      View students by organization, grade, and section.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="mt-7 space-y-3 p-0">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3 text-gray-600">
                    <UsersRound className="h-4 w-4 text-emerald-700" />
                    <span className="text-sm font-medium">Total students</span>
                  </div>

                  <span className="text-base font-semibold text-gray-900">
                    {isDashboardStatsLoading
                      ? '...'
                      : formatNumber(studentStats.totalStudents)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Building2 className="h-4 w-4 text-emerald-700" />
                    <span className="text-sm font-medium">Organizations</span>
                  </div>

                  <span className="text-base font-semibold text-gray-900">
                    {isDashboardStatsLoading
                      ? '...'
                      : formatNumber(studentStats.organizationCount)}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 transition group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Student management
                    </p>
                    <p className="text-lg font-semibold text-gray-900">Open</p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-emerald-700 transition group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/teachers"
            className="group block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2"
          >
            <Card className="h-full rounded-3xl border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="p-0">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100">
                    <UserRoundCheck className="h-7 w-7 text-sky-700" />
                  </div>

                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Teachers
                    </CardTitle>
                    <p className="mt-1 max-w-xs text-sm font-medium leading-6 text-gray-600">
                      View teachers by organization and manage teacher accounts.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="mt-7 space-y-3 p-0">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3 text-gray-600">
                    <UserRoundCheck className="h-4 w-4 text-sky-700" />
                    <span className="text-sm font-medium">Total teachers</span>
                  </div>

                  <span className="text-base font-semibold text-gray-900">
                    {isDashboardStatsLoading
                      ? '...'
                      : formatNumber(teacherStats.totalTeachers)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Building2 className="h-4 w-4 text-sky-700" />
                    <span className="text-sm font-medium">Organizations</span>
                  </div>

                  <span className="text-base font-semibold text-gray-900">
                    {isDashboardStatsLoading
                      ? '...'
                      : formatNumber(teacherStats.organizationCount)}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 transition group-hover:border-sky-200 group-hover:bg-sky-50/50">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Teacher management
                    </p>
                    <p className="text-lg font-semibold text-gray-900">Open</p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-sky-700 transition group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {!isSuperAdmin && user && (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm capitalize text-gray-900">
                  {user.role.toLowerCase().replace('_', ' ')}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

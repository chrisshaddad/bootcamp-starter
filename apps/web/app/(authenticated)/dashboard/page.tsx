'use client';

import Link from 'next/link';
import { GraduationCap, UserRoundCheck } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, isLoading } = useUser();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
          <Link href="/students" className="block">
            <Card className="h-full cursor-pointer border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100">
                    <GraduationCap className="h-6 w-6 text-gray-700" />
                  </div>

                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Students
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      View students by organization, grade, and section.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Student Management
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">Open</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teachers" className="block">
            <Card className="h-full cursor-pointer border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100">
                    <UserRoundCheck className="h-6 w-6 text-gray-700" />
                  </div>

                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Teachers
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      View teachers by organization.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Teacher Management
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">Open</p>
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

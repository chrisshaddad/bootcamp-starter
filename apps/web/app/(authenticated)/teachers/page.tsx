'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import type { TeacherOrganizationsResponse } from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';

type TeacherOrganizationCard =
  TeacherOrganizationsResponse['organizations'][number];

export default function TeachersPage() {
  const [organizations, setOrganizations] = useState<TeacherOrganizationCard[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizations() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetcher<TeacherOrganizationsResponse>(
          '/teachers/organizations',
        );

        setOrganizations(data.organizations);
      } catch (error) {
        console.error('Failed to load teacher organizations:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load teacher organizations.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadOrganizations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Teachers by Organization
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select an organization to view its teachers.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}

      {!isLoading && error && (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && organizations.length === 0 && (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">
              No organizations with teachers were found.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && organizations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {organizations.map((organization) => (
            <Link
              key={organization.id}
              href={`/teachers/${organization.id}`}
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
            >
              <Card className="h-full cursor-pointer border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                      <Building2 className="h-5 w-5 text-gray-700" />
                    </div>

                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {organization.name}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-500">
                        {organization.description ||
                          'No description available.'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Teachers
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {organization.teacherCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

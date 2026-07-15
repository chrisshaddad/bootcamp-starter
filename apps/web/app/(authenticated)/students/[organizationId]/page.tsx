'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import type { StudentOrganizationGradesResponse } from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';

type StudentGradeCard = StudentOrganizationGradesResponse['grades'][number];

interface StudentsOrganizationPageProps {
  params: Promise<{
    organizationId: string;
  }>;
}

export default function StudentsOrganizationPage({
  params,
}: StudentsOrganizationPageProps) {
  const { organizationId } = use(params);

  const [grades, setGrades] = useState<StudentGradeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGrades() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetcher<StudentOrganizationGradesResponse>(
          `/students/organizations/${organizationId}/grades`,
        );

        setGrades(data.grades);
      } catch (error) {
        console.error('Failed to load student grades:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load student grades.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadGrades();
  }, [organizationId]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/students"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Organization Grades
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select a grade to view students in this organization.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      )}

      {!isLoading && error && (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && grades.length === 0 && (
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">
              No grades with students were found for this organization.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && grades.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {grades.map((grade) => (
            <Link
              key={grade.id}
              href={`/students/${organizationId}/grades/${grade.id}`}
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
            >
              <Card className="h-full cursor-pointer border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                      <GraduationCap className="h-5 w-5 text-gray-700" />
                    </div>

                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {grade.name}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-500">
                        {grade.sectionCount} sections
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-500">
                      Students
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {grade.studentCount}
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

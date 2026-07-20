'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, GraduationCap, UsersRound } from 'lucide-react';
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatSections(value: number) {
  return `${formatNumber(value)} ${value === 1 ? 'section' : 'sections'}`;
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

    void loadGrades();
  }, [organizationId]);

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/students"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#59657c] transition-colors hover:text-[#0000FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Link>

        <div className="mt-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#17223b]">
            Organization Grades
          </h1>

          <p className="mt-1 text-sm text-[#7b8598]">
            Select a grade to view students in this organization.
          </p>
        </div>
      </header>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-[220px] rounded-lg" />
          <Skeleton className="h-[220px] rounded-lg" />
          <Skeleton className="h-[220px] rounded-lg" />
        </div>
      )}

      {!isLoading && error && (
        <Card className="gap-0 rounded-lg border-red-200 bg-red-50 py-0 shadow-none">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && grades.length === 0 && (
        <Card className="gap-0 rounded-lg border-[#dfe3ed] bg-white py-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex min-h-28 flex-col items-center justify-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eeeeff]">
                <GraduationCap className="h-5 w-5 text-[#0000FF]" />
              </div>

              <p className="mt-3 text-sm font-semibold text-[#17223b]">
                No grades found
              </p>

              <p className="mt-1 text-xs text-[#7b8598]">
                No grades with students were found for this organization.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && grades.length > 0 && (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {grades.map((grade) => (
            <Link
              key={grade.id}
              href={`/students/${organizationId}/grades/${grade.id}`}
              className="group block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
            >
              <Card className="h-full min-h-[220px] gap-0 overflow-hidden rounded-lg border-[#dfe3ed] bg-white py-0 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[#bfc4ff] group-hover:shadow-md">
                <CardHeader className="flex-1 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eeeeff]">
                      <GraduationCap className="h-5 w-5 text-[#0000FF]" />
                    </div>

                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold leading-5 text-[#17223b]">
                        {grade.name}
                      </CardTitle>

                      <p className="mt-2 text-xs leading-5 text-[#7b8598]">
                        {formatSections(grade.sectionCount)}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="mt-auto border-t border-[#e7e9f0] bg-[#f8f9fd] p-4">
                  <div className="flex items-center justify-between rounded-md border border-[#e3e6ee] bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eeeeff]">
                        <UsersRound className="h-4 w-4 text-[#0000FF]" />
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b94a7]">
                          Students
                        </p>

                        <p className="mt-0.5 text-xl font-bold text-[#17223b]">
                          {formatNumber(grade.studentCount)}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-[#59657c] transition-transform group-hover:translate-x-1 group-hover:text-[#0000FF]" />
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

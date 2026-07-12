'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const organizationGrades = [
  {
    id: 'grade-9',
    name: 'Grade 9',
    sectionCount: 2,
    studentCount: 3,
  },
  {
    id: 'grade-10',
    name: 'Grade 10',
    sectionCount: 3,
    studentCount: 2,
  },
  {
    id: 'grade-11',
    name: 'Grade 11',
    sectionCount: 2,
    studentCount: 1,
  },
];

const organizationNames: Record<string, string> = {
  'techcorp-academy': 'TechCorp Academy',
  'green-energy-school': 'Green Energy School',
  'healthfirst-institute': 'HealthFirst Institute',
};

interface StudentsOrganizationPageProps {
  params: Promise<{
    organizationId: string;
  }>;
}

export default function StudentsOrganizationPage({
  params,
}: StudentsOrganizationPageProps) {
  const { organizationId } = use(params);

  const organizationName = organizationNames[organizationId] || 'Organization';

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
            {organizationName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select a grade to view students in this organization.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {organizationGrades.map((grade) => (
          <Link
            key={grade.id}
            href={`/students/${organizationId}/grades/${grade.id}`}
            className="block"
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
                  <p className="text-sm font-medium text-gray-500">Students</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {grade.studentCount}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

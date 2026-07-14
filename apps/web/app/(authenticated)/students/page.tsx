import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const studentOrganizations = [
  {
    id: 'techcorp-academy',
    name: 'TechCorp Academy',
    description: 'Technology and software bootcamp organization.',
    studentCount: 3,
  },
  {
    id: 'green-energy-school',
    name: 'Green Energy School',
    description: 'Engineering and sustainability education organization.',
    studentCount: 2,
  },
  {
    id: 'healthfirst-institute',
    name: 'HealthFirst Institute',
    description: 'Healthcare education organization.',
    studentCount: 1,
  },
];

export default function StudentsPage() {
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
            Students by Organization
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select an organization to view its student grades.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {studentOrganizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/students/${organization.id}`}
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
                      {organization.description}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Students
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {organization.studentCount}
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

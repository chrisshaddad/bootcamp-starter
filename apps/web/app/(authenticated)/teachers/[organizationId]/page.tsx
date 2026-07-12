'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2, UserRoundCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const organizationNames: Record<string, string> = {
  'techcorp-academy': 'TechCorp Academy',
  'green-energy-school': 'Green Energy School',
  'healthfirst-institute': 'HealthFirst Institute',
};

const teachersByOrganization: Record<
  string,
  {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }[]
> = {
  'techcorp-academy': [
    {
      id: '1',
      name: 'Sarah Chen',
      email: 'admin@techcorp.example.com',
      role: 'Teacher / Admin',
      status: 'Active',
      createdAt: '2026-07-01',
    },
    {
      id: '2',
      name: 'John Carter',
      email: 'john.teacher@techcorp.example.com',
      role: 'Teacher / Admin',
      status: 'Active',
      createdAt: '2026-07-05',
    },
  ],
  'green-energy-school': [
    {
      id: '3',
      name: 'Michael Green',
      email: 'admin@greenenergy.example.com',
      role: 'Teacher / Admin',
      status: 'Active',
      createdAt: '2026-07-01',
    },
  ],
  'healthfirst-institute': [
    {
      id: '4',
      name: 'Dr. Emily Watson',
      email: 'admin@healthfirst.example.com',
      role: 'Teacher / Admin',
      status: 'Active',
      createdAt: '2026-07-01',
    },
  ],
};

interface TeachersOrganizationPageProps {
  params: Promise<{
    organizationId: string;
  }>;
}

export default function TeachersOrganizationPage({
  params,
}: TeachersOrganizationPageProps) {
  const { organizationId } = use(params);

  const organizationName = organizationNames[organizationId] || 'Organization';
  const teachers = teachersByOrganization[organizationId] || [];

  function handleUpdateTeacher(teacherId: string) {
    alert(`Update teacher ${teacherId} - UI only for now.`);
  }

  function handleDeleteTeacher(teacherId: string) {
    alert(`Delete teacher ${teacherId} - UI only for now.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teachers"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {organizationName} Teachers
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View, update, and delete teachers in this organization.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
              <UserRoundCheck className="h-5 w-5 text-gray-700" />
            </div>

            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Teacher List
              </CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                All teachers belonging to {organizationName}.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created At</th>
                    <th className="px-5 py-3">Update</th>
                    <th className="px-5 py-3">Delete</th>
                  </tr>
                </thead>

                <tbody>
                  {teachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {teacher.name}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {teacher.email}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {teacher.role}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                          {teacher.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {teacher.createdAt}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleUpdateTeacher(teacher.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Update
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-error/20 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

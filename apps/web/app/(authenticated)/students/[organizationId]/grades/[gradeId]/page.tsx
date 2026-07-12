'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const organizationNames: Record<string, string> = {
  'techcorp-academy': 'TechCorp Academy',
  'green-energy-school': 'Green Energy School',
  'healthfirst-institute': 'HealthFirst Institute',
};

const gradeNames: Record<string, string> = {
  'grade-9': 'Grade 9',
  'grade-10': 'Grade 10',
  'grade-11': 'Grade 11',
};

const students = [
  {
    id: '1',
    studentCode: 'STU-0001',
    name: 'Mia Farchoukh',
    email: 'mia@student.local',
    section: 'A',
    dateOfBirth: '2009-02-22',
    status: 'Active',
  },
  {
    id: '2',
    studentCode: 'STU-0002',
    name: 'Adam Khoury',
    email: 'adam@student.local',
    section: 'A',
    dateOfBirth: '2009-05-14',
    status: 'Active',
  },
  {
    id: '3',
    studentCode: 'STU-0003',
    name: 'Lea Haddad',
    email: 'lea@student.local',
    section: 'B',
    dateOfBirth: '2009-09-10',
    status: 'Active',
  },
];

interface GradeStudentsPageProps {
  params: Promise<{
    organizationId: string;
    gradeId: string;
  }>;
}

export default function GradeStudentsPage({ params }: GradeStudentsPageProps) {
  const { organizationId, gradeId } = use(params);

  const organizationName = organizationNames[organizationId] || 'Organization';
  const gradeName = gradeNames[gradeId] || 'Grade';

  function handleUpdateStudent(studentId: string) {
    alert(`Update student ${studentId} - UI only for now.`);
  }

  function handleDeleteStudent(studentId: string) {
    alert(`Delete student ${studentId} - UI only for now.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/students/${organizationId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Grades
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {gradeName} Students
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {organizationName} · View, update, and delete students in this
            grade.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Student List
          </CardTitle>
          <p className="mt-1 text-sm text-gray-500">
            All students belonging to {gradeName} in {organizationName}.
          </p>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Student Code</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Section</th>
                    <th className="px-5 py-3">Date of Birth</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Update</th>
                    <th className="px-5 py-3">Delete</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {student.studentCode}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {student.name}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {student.email}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {student.section}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {student.dateOfBirth}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          {student.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleUpdateStudent(student.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Update
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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

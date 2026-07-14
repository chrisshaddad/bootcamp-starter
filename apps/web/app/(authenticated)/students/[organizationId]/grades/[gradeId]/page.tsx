'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import type { StudentsByGradeResponse } from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';

type StudentListItem = StudentsByGradeResponse['students'][number];

interface GradeStudentsPageProps {
  params: Promise<{
    organizationId: string;
    gradeId: string;
  }>;
}

export default function GradeStudentsPage({ params }: GradeStudentsPageProps) {
  const { organizationId, gradeId } = use(params);

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudents() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetcher<StudentsByGradeResponse>(
          `/students/organizations/${organizationId}/grades/${gradeId}`,
        );

        setStudents(data.students);
      } catch (error) {
        console.error('Failed to load students:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to load students.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadStudents();
  }, [organizationId, gradeId]);

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
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            View, update, and delete students in this grade.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Student List
          </CardTitle>
          <p className="mt-1 text-sm text-gray-500">
            Students loaded from the backend API.
          </p>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!isLoading && error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!isLoading && !error && students.length === 0 && (
            <p className="text-sm text-gray-500">
              No students were found for this grade.
            </p>
          )}

          {!isLoading && !error && students.length > 0 && (
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
                          {student.sectionName || '-'}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {student.dateOfBirth || '-'}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

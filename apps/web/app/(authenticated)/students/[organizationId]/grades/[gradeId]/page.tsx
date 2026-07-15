'use client';

import { FormEvent, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2, X } from 'lucide-react';
import type {
  StudentActionResponse,
  StudentsByGradeResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiDelete, apiPatch, fetcher } from '@/lib/api';

type StudentListItem = StudentsByGradeResponse['students'][number];

interface GradeStudentsPageProps {
  params: Promise<{
    organizationId: string;
    gradeId: string;
  }>;
}

interface StudentFormState {
  name: string;
  email: string;
  studentCode: string;
  dateOfBirth: string;
}

export default function GradeStudentsPage({ params }: GradeStudentsPageProps) {
  const { organizationId, gradeId } = use(params);

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(
    null,
  );
  const [form, setForm] = useState<StudentFormState>({
    name: '',
    email: '',
    studentCode: '',
    dateOfBirth: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<
    string | null
  >(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(
    null,
  );

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

  function openUpdateModal(student: StudentListItem) {
    setEditingStudent(student);
    setForm({
      name: student.name,
      email: student.email,
      studentCode: student.studentCode,
      dateOfBirth: student.dateOfBirth || '',
    });
  }

  function closeUpdateModal() {
    setEditingStudent(null);
    setForm({
      name: '',
      email: '',
      studentCode: '',
      dateOfBirth: '',
    });
  }

  async function handleUpdateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingStudent) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload: UpdateStudentRequest = {
      name: form.name,
      email: form.email,
      studentCode: form.studentCode,
      dateOfBirth: form.dateOfBirth || null,
    };

    try {
      const updatedStudent = await apiPatch<UpdateStudentResponse>(
        `/students/${editingStudent.id}`,
        payload,
      );

      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === updatedStudent.id ? updatedStudent : student,
        ),
      );

      closeUpdateModal();
    } catch (error) {
      console.error('Failed to update student:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update student.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteStudent(studentId: string) {
    if (deletingStudentId) {
      return;
    }

    if (confirmDeleteStudentId !== studentId) {
      setConfirmDeleteStudentId(studentId);
      return;
    }

    setDeletingStudentId(studentId);
    setError(null);

    try {
      await apiDelete<StudentActionResponse>(`/students/${studentId}`);

      setStudents((currentStudents) =>
        currentStudents.filter((student) => student.id !== studentId),
      );

      setConfirmDeleteStudentId(null);
    } catch (error) {
      console.error('Failed to delete student:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to delete student.',
      );
    } finally {
      setDeletingStudentId(null);
    }
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
            <p className="mb-4 text-sm text-error">{error}</p>
          )}

          {!isLoading && !error && students.length === 0 && (
            <p className="text-sm text-gray-500">
              No students were found for this grade.
            </p>
          )}

          {!isLoading && students.length > 0 && (
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
                            onClick={() => openUpdateModal(student)}
                            disabled={deletingStudentId !== null}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Update
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.id)}
                            disabled={deletingStudentId !== null}
                            className="inline-flex items-center gap-2 rounded-lg border border-error/20 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingStudentId === student.id
                              ? 'Deleting...'
                              : confirmDeleteStudentId === student.id
                                ? 'Confirm delete'
                                : 'Delete'}
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

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Update Student
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Edit student information and save changes.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUpdateModal}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      email: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Student Code
                </label>
                <input
                  value={form.studentCode}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      studentCode: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      dateOfBirth: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

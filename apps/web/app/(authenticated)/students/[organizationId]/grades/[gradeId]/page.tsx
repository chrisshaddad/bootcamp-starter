'use client';

import { use, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import type {
  StudentActionResponse,
  StudentsByGradeResponse,
  UpdateStudentRequest,
  UpdateStudentResponse,
} from '@repo/contracts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date);
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

    void loadStudents();
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
        `/students/organizations/${organizationId}/students/${editingStudent.id}`,
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
      await apiDelete<StudentActionResponse>(
        `/students/organizations/${organizationId}/students/${studentId}`,
      );

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
    <div className="space-y-5">
      <header>
        <Link
          href={`/students/${organizationId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#59657c] transition-colors hover:text-[#0000FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Grades
        </Link>

        <div className="mt-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#17223b]">
            Students
          </h1>

          <p className="mt-1 text-sm text-[#7b8598]">
            View, update, and delete students in this grade.
          </p>
        </div>
      </header>

      <Card className="gap-0 overflow-hidden rounded-lg border-[#dfe3ed] bg-white py-0 shadow-sm">
        <CardHeader className="border-b border-[#e7e9f0] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eeeeff]">
              <GraduationCap className="h-5 w-5 text-[#0000FF]" />
            </div>

            <div>
              <CardTitle className="text-base font-bold text-[#17223b]">
                Student List
              </CardTitle>

              <p className="mt-1 text-xs text-[#7b8598]">
                Students loaded from the backend API.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
            </div>
          )}

          {!isLoading && error && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3"
            >
              <p className="text-xs font-medium text-red-700">{error}</p>
            </div>
          )}

          {!isLoading && !error && students.length === 0 && (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-[#e3e6ee] bg-[#f8f9fd] px-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eeeeff]">
                <GraduationCap className="h-5 w-5 text-[#0000FF]" />
              </div>

              <p className="mt-3 text-sm font-semibold text-[#17223b]">
                No students found
              </p>

              <p className="mt-1 text-xs text-[#7b8598]">
                No students were found for this grade.
              </p>
            </div>
          )}

          {!isLoading && !error && students.length > 0 && (
            <div className="overflow-hidden rounded-md border border-[#dfe3ed]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead className="bg-[#f8f9fd]">
                    <tr>
                      {[
                        'Student code',
                        'Name',
                        'Email',
                        'Section',
                        'Date of birth',
                        'Status',
                        'Actions',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b94a7]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e7e9f0] bg-white">
                    {students.map((student) => {
                      const isDeleting = deletingStudentId === student.id;

                      const isConfirmingDelete =
                        confirmDeleteStudentId === student.id;

                      return (
                        <tr
                          key={student.id}
                          className="transition-colors hover:bg-[#fafaff]"
                        >
                          <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#0000FF]">
                            {student.studentCode}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#17223b]">
                            {student.name}
                          </td>

                          <td className="px-4 py-4 text-xs text-[#68748a]">
                            {student.email}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-[#68748a]">
                            {student.sectionName || '—'}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-[#68748a]">
                            {formatDate(student.dateOfBirth)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <span className="inline-flex rounded-full bg-[#e8f8f0] px-2.5 py-1 text-[10px] font-bold text-[#0b9b57]">
                              {formatStatus(student.status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openUpdateModal(student)}
                                disabled={deletingStudentId !== null}
                                className="inline-flex h-8 items-center gap-2 rounded-md border border-[#dfe3ed] bg-white px-3 text-[11px] font-semibold text-[#354158] transition-colors hover:border-[#bfc4ff] hover:bg-[#f8f8ff] hover:text-[#0000FF] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Update
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteStudent(student.id)
                                }
                                disabled={deletingStudentId !== null}
                                className="inline-flex h-8 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />

                                {isDeleting
                                  ? 'Deleting...'
                                  : isConfirmingDelete
                                    ? 'Confirm delete'
                                    : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => {
          if (isSaving) {
            return;
          }

          if (!open) {
            closeUpdateModal();
          }
        }}
      >
        <DialogContent className="max-w-md rounded-lg border-[#dfe3ed] bg-white">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-[#eeeeff]">
              <Pencil className="h-5 w-5 text-[#0000FF]" />
            </div>

            <DialogTitle className="text-lg font-bold text-[#17223b]">
              Update Student
            </DialogTitle>

            <DialogDescription className="text-xs text-[#7b8598]">
              Edit the student information and save your changes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateStudent} className="space-y-4">
            <div>
              <label
                htmlFor="student-name"
                className="text-xs font-semibold text-[#354158]"
              >
                Name
              </label>

              <input
                id="student-name"
                value={form.name}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    name: event.target.value,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-md border border-[#dfe3ed] bg-white px-3 text-sm text-[#17223b] outline-none transition focus:border-[#0000FF] focus:ring-2 focus:ring-[#0000FF]/10"
                required
              />
            </div>

            <div>
              <label
                htmlFor="student-email"
                className="text-xs font-semibold text-[#354158]"
              >
                Email
              </label>

              <input
                id="student-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    email: event.target.value,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-md border border-[#dfe3ed] bg-white px-3 text-sm text-[#17223b] outline-none transition focus:border-[#0000FF] focus:ring-2 focus:ring-[#0000FF]/10"
                required
              />
            </div>

            <div>
              <label
                htmlFor="student-code"
                className="text-xs font-semibold text-[#354158]"
              >
                Student Code
              </label>

              <input
                id="student-code"
                value={form.studentCode}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    studentCode: event.target.value,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-md border border-[#dfe3ed] bg-white px-3 text-sm text-[#17223b] outline-none transition focus:border-[#0000FF] focus:ring-2 focus:ring-[#0000FF]/10"
                required
              />
            </div>

            <div>
              <label
                htmlFor="student-date-of-birth"
                className="text-xs font-semibold text-[#354158]"
              >
                Date of Birth
              </label>

              <input
                id="student-date-of-birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    dateOfBirth: event.target.value,
                  }))
                }
                className="mt-1.5 h-10 w-full rounded-md border border-[#dfe3ed] bg-white px-3 text-sm text-[#17223b] outline-none transition focus:border-[#0000FF] focus:ring-2 focus:ring-[#0000FF]/10"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e7e9f0] pt-4">
              <button
                type="button"
                onClick={closeUpdateModal}
                disabled={isSaving}
                className="h-9 rounded-md border border-[#dfe3ed] bg-white px-4 text-xs font-semibold text-[#59657c] transition-colors hover:bg-[#f8f9fd] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="h-9 rounded-md bg-[#0000FF] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#0000cc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { use, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2, UserRoundCheck } from 'lucide-react';
import type {
  TeacherActionResponse,
  TeachersByOrganizationResponse,
  UpdateTeacherRequest,
  UpdateTeacherResponse,
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

type TeacherListItem = TeachersByOrganizationResponse['teachers'][number];

interface TeachersOrganizationPageProps {
  params: Promise<{
    organizationId: string;
  }>;
}

interface TeacherFormState {
  name: string;
  email: string;
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatDate(value: string) {
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

export default function TeachersOrganizationPage({
  params,
}: TeachersOrganizationPageProps) {
  const { organizationId } = use(params);

  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTeacher, setEditingTeacher] = useState<TeacherListItem | null>(
    null,
  );

  const [form, setForm] = useState<TeacherFormState>({
    name: '',
    email: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const [confirmDeleteTeacherId, setConfirmDeleteTeacherId] = useState<
    string | null
  >(null);

  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function loadTeachers() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetcher<TeachersByOrganizationResponse>(
          `/teachers/organizations/${organizationId}`,
        );

        setTeachers(data.teachers);
      } catch (error) {
        console.error('Failed to load teachers:', error);

        setError(
          error instanceof Error ? error.message : 'Failed to load teachers.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadTeachers();
  }, [organizationId]);

  function openUpdateModal(teacher: TeacherListItem) {
    setEditingTeacher(teacher);

    setForm({
      name: teacher.name,
      email: teacher.email,
    });
  }

  function closeUpdateModal() {
    setEditingTeacher(null);

    setForm({
      name: '',
      email: '',
    });
  }

  async function handleUpdateTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTeacher) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload: UpdateTeacherRequest = {
      name: form.name,
      email: form.email,
    };

    try {
      const updatedTeacher = await apiPatch<UpdateTeacherResponse>(
        `/teachers/organizations/${organizationId}/teachers/${editingTeacher.id}`,
        payload,
      );

      setTeachers((currentTeachers) =>
        currentTeachers.map((teacher) =>
          teacher.id === updatedTeacher.id ? updatedTeacher : teacher,
        ),
      );

      closeUpdateModal();
    } catch (error) {
      console.error('Failed to update teacher:', error);

      setError(
        error instanceof Error ? error.message : 'Failed to update teacher.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTeacher(teacherId: string) {
    if (deletingTeacherId) {
      return;
    }

    if (confirmDeleteTeacherId !== teacherId) {
      setConfirmDeleteTeacherId(teacherId);
      return;
    }

    setDeletingTeacherId(teacherId);
    setError(null);

    try {
      await apiDelete<TeacherActionResponse>(
        `/teachers/organizations/${organizationId}/teachers/${teacherId}`,
      );

      setTeachers((currentTeachers) =>
        currentTeachers.filter((teacher) => teacher.id !== teacherId),
      );

      setConfirmDeleteTeacherId(null);
    } catch (error) {
      console.error('Failed to delete teacher:', error);

      setError(
        error instanceof Error ? error.message : 'Failed to delete teacher.',
      );
    } finally {
      setDeletingTeacherId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/teachers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#59657c] transition-colors hover:text-[#0000FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Link>

        <div className="mt-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#17223b]">
            Teachers
          </h1>

          <p className="mt-1 text-sm text-[#7b8598]">
            View, update, and delete teachers in this organization.
          </p>
        </div>
      </header>

      <Card className="gap-0 overflow-hidden rounded-lg border-[#dfe3ed] bg-white py-0 shadow-sm">
        <CardHeader className="border-b border-[#e7e9f0] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eeeeff]">
              <UserRoundCheck className="h-5 w-5 text-[#0000FF]" />
            </div>

            <div>
              <CardTitle className="text-base font-bold text-[#17223b]">
                Teacher List
              </CardTitle>

              <p className="mt-1 text-xs text-[#7b8598]">
                Teachers loaded from the backend API.
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

          {!isLoading && !error && teachers.length === 0 && (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-[#e3e6ee] bg-[#f8f9fd] px-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eeeeff]">
                <UserRoundCheck className="h-5 w-5 text-[#0000FF]" />
              </div>

              <p className="mt-3 text-sm font-semibold text-[#17223b]">
                No teachers found
              </p>

              <p className="mt-1 text-xs text-[#7b8598]">
                No teachers were found for this organization.
              </p>
            </div>
          )}

          {!isLoading && !error && teachers.length > 0 && (
            <div className="overflow-hidden rounded-md border border-[#dfe3ed]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] border-collapse text-left">
                  <thead className="bg-[#f8f9fd]">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b94a7]">
                        Name
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b94a7]">
                        Email
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b94a7]">
                        Role
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b94a7]">
                        Status
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b94a7]">
                        Created
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b94a7]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e7e9f0] bg-white">
                    {teachers.map((teacher) => {
                      const isDeleting = deletingTeacherId === teacher.id;

                      const isConfirmingDelete =
                        confirmDeleteTeacherId === teacher.id;

                      return (
                        <tr
                          key={teacher.id}
                          className="transition-colors hover:bg-[#fafaff]"
                        >
                          <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#17223b]">
                            {teacher.name}
                          </td>

                          <td className="px-4 py-4 text-xs text-[#68748a]">
                            {teacher.email}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-[#68748a]">
                            {formatRole(teacher.role)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <span className="inline-flex rounded-full bg-[#e8f8f0] px-2.5 py-1 text-[10px] font-bold text-[#0b9b57]">
                              {formatStatus(teacher.status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-[#68748a]">
                            {formatDate(teacher.createdAt)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openUpdateModal(teacher)}
                                disabled={deletingTeacherId !== null}
                                className="inline-flex h-8 items-center gap-2 rounded-md border border-[#dfe3ed] bg-white px-3 text-[11px] font-semibold text-[#354158] transition-colors hover:border-[#bfc4ff] hover:bg-[#f8f8ff] hover:text-[#0000FF] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Update
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteTeacher(teacher.id)
                                }
                                disabled={deletingTeacherId !== null}
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
        open={!!editingTeacher}
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
              Update Teacher
            </DialogTitle>

            <DialogDescription className="text-xs text-[#7b8598]">
              Edit the teacher information and save your changes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTeacher} className="space-y-4">
            <div>
              <label
                htmlFor="teacher-name"
                className="text-xs font-semibold text-[#354158]"
              >
                Name
              </label>

              <input
                id="teacher-name"
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
                htmlFor="teacher-email"
                className="text-xs font-semibold text-[#354158]"
              >
                Email
              </label>

              <input
                id="teacher-email"
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

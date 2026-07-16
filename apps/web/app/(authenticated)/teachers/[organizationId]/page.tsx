'use client';

import { FormEvent, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import type {
  TeacherActionResponse,
  TeachersByOrganizationResponse,
  UpdateTeacherRequest,
  UpdateTeacherResponse,
} from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiDelete, apiPatch, fetcher } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

    loadTeachers();
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
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="mt-1 text-sm text-gray-500">
            View, update, and delete teachers in this organization.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Teacher List
          </CardTitle>
          <p className="mt-1 text-sm text-gray-500">
            Teachers loaded from the backend API.
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

          {!isLoading && !error && teachers.length === 0 && (
            <p className="text-sm text-gray-500">
              No teachers were found for this organization.
            </p>
          )}

          {!isLoading && teachers.length > 0 && (
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
                            onClick={() => openUpdateModal(teacher)}
                            disabled={deletingTeacherId !== null}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Update
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            disabled={deletingTeacherId !== null}
                            className="inline-flex items-center gap-2 rounded-lg border border-error/20 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingTeacherId === teacher.id
                              ? 'Deleting...'
                              : confirmDeleteTeacherId === teacher.id
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Teacher</DialogTitle>
            <DialogDescription>
              Edit teacher information and save changes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTeacher} className="space-y-4">
            <div>
              <label
                htmlFor="teacher-name"
                className="text-sm font-medium text-gray-700"
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                required
              />
            </div>

            <div>
              <label
                htmlFor="teacher-email"
                className="text-sm font-medium text-gray-700"
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeUpdateModal}
                disabled={isSaving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

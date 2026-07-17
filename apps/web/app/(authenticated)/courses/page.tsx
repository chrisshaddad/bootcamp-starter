'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  Trash2,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  CourseActionResponse,
  CourseListItem,
  CourseListResponse,
  TeacherOrganizationsResponse,
  UpdateCourseRequest,
  UpdateCourseResponse,
} from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiDelete, apiPatch, fetcher } from '@/lib/api';

type OrganizationItem = TeacherOrganizationsResponse['organizations'][number];

interface UpdateFormState {
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function getStatusClass(status: CourseListItem['status']) {
  if (status === 'published') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (status === 'archived') {
    return 'bg-gray-100 text-gray-600 ring-gray-200';
  }

  return 'bg-amber-50 text-amber-700 ring-amber-200';
}

export default function CoursesPage() {
  const [organizationId, setOrganizationId] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const [editingCourse, setEditingCourse] = useState<CourseListItem | null>(
    null,
  );
  const [deletingCourse, setDeletingCourse] = useState<CourseListItem | null>(
    null,
  );

  const [form, setForm] = useState<UpdateFormState>({
    title: '',
    description: '',
    status: 'draft',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: organizationData, isLoading: isLoadingOrganizations } =
    useSWR<TeacherOrganizationsResponse>('/teachers/organizations', fetcher);

  const {
    data: courseData,
    isLoading: isLoadingCourses,
    mutate,
  } = useSWR<CourseListResponse>(
    organizationId ? `/courses/organizations/${organizationId}` : null,
    fetcher,
  );

  const organizations = organizationData?.organizations ?? [];
  const courses = courseData?.courses ?? [];

  function openUpdateModal(course: CourseListItem) {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description ?? '',
      status: course.status,
    });
  }

  function closeUpdateModal() {
    if (isSaving) {
      return;
    }

    setEditingCourse(null);
    setForm({
      title: '',
      description: '',
      status: 'draft',
    });
  }

  function openDeleteModal(course: CourseListItem) {
    setDeletingCourse(course);
  }

  function closeDeleteModal() {
    if (isDeleting) {
      return;
    }

    setDeletingCourse(null);
  }

  async function handleUpdateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingCourse || !organizationId) {
      return;
    }

    setIsSaving(true);

    const payload: UpdateCourseRequest = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
    };

    try {
      const updatedCourse = await apiPatch<UpdateCourseResponse>(
        `/courses/organizations/${organizationId}/courses/${editingCourse.id}`,
        payload,
      );

      await mutate((currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          courses: currentData.courses.map((course) =>
            course.id === updatedCourse.id ? updatedCourse : course,
          ),
        };
      }, false);

      toast.success('Course updated successfully.');
      closeUpdateModal();
    } catch (error) {
      console.error('Failed to update course:', error);
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update course.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCourse() {
    if (!deletingCourse || !organizationId) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiDelete<CourseActionResponse>(
        `/courses/organizations/${organizationId}/courses/${deletingCourse.id}`,
      );

      await mutate((currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          courses: currentData.courses.filter(
            (course) => course.id !== deletingCourse.id,
          ),
        };
      }, false);

      toast.success('Course deleted successfully.');
      setDeletingCourse(null);
    } catch (error) {
      console.error('Failed to delete course:', error);
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete course.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

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
            Course Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View, update, and delete courses in card format.
          </p>
        </div>
      </div>

      <Card className="rounded-3xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Select Organization
          </CardTitle>
        </CardHeader>

        <CardContent>
          <select
            value={organizationId}
            onChange={(event) => {
              setOrganizationId(event.target.value);
              setExpandedCourseId(null);
            }}
            disabled={isLoadingOrganizations}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {isLoadingOrganizations
                ? 'Loading organizations...'
                : 'Select organization'}
            </option>

            {organizations.map((organization: OrganizationItem) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {organizationId && isLoadingCourses && (
        <Card className="rounded-3xl border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Loading courses...</p>
        </Card>
      )}

      {organizationId && !isLoadingCourses && courses.length === 0 && (
        <Card className="rounded-3xl border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            No courses found for this organization.
          </p>
        </Card>
      )}

      {organizationId && courses.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const isExpanded = expandedCourseId === course.id;

            return (
              <Card
                key={course.id}
                onClick={() =>
                  setExpandedCourseId(isExpanded ? null : course.id)
                }
                className="group cursor-pointer rounded-3xl border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <CardHeader className="p-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
                        <BookOpen className="h-7 w-7 text-indigo-700" />
                      </div>

                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          {course.title}
                        </CardTitle>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="mt-6 space-y-3 p-0">
                  <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3 text-gray-600">
                      <UserRoundCheck className="h-4 w-4 text-indigo-700" />
                      <span className="text-sm font-medium">Teacher</span>
                    </div>

                    <span className="max-w-[160px] truncate text-sm font-semibold text-gray-900">
                      {course.teacher.name ?? course.teacher.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Building2 className="h-4 w-4 text-indigo-700" />
                      <span className="text-sm font-medium">Grade</span>
                    </div>

                    <span className="text-sm font-semibold text-gray-900">
                      {course.section
                        ? `${course.section.gradeLevel.name} / ${course.section.name}`
                        : 'No section'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3 text-gray-600">
                      <CalendarDays className="h-4 w-4 text-indigo-700" />
                      <span className="text-sm font-medium">Created</span>
                    </div>

                    <span className="text-sm font-semibold text-gray-900">
                      {formatDate(course.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${getStatusClass(
                        course.status,
                      )}`}
                    >
                      {course.status}
                    </span>

                    <span className="text-xs text-gray-400">
                      Click card to expand
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-gray-100 pt-5">
                      <div>
                        <p className="text-sm font-semibold text-gray-500">
                          Description
                        </p>
                        <p className="mt-1 text-sm leading-6 text-gray-800">
                          {course.description || 'No description'}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-500">
                          Subject
                        </p>
                        <p className="mt-1 text-sm leading-6 text-gray-800">
                          {course.subject.name}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-indigo-50 p-4">
                          <div className="flex items-center gap-2 text-indigo-700">
                            <UserRoundCheck className="h-4 w-4" />
                            <p className="text-sm font-medium">Enrollments</p>
                          </div>
                          <p className="mt-2 text-xl font-bold text-gray-900">
                            {course._count.enrollments}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-indigo-50 p-4">
                          <div className="flex items-center gap-2 text-indigo-700">
                            <ClipboardList className="h-4 w-4" />
                            <p className="text-sm font-medium">Assignments</p>
                          </div>
                          <p className="mt-2 text-xl font-bold text-gray-900">
                            {course._count.assignments}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    onClick={(event) => event.stopPropagation()}
                    className="grid grid-cols-2 gap-3 pt-3"
                  >
                    <button
                      type="button"
                      onClick={() => openUpdateModal(course)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4" />
                      Update
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(course)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingCourse && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-[92vw] max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Update Course</h2>
              <p className="mt-1 text-sm text-gray-500">
                Edit course information and save changes.
              </p>
            </div>

            <form onSubmit={handleUpdateCourse} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Course Title
                </label>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      status: event.target.value as
                        | 'draft'
                        | 'published'
                        | 'archived',
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-gray-900">
              Delete course?
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">
                {deletingCourse.title}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={isDeleting}
                className="rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:border-red-700 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

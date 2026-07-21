'use client';

import { useState } from 'react';
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
import {
  UpdateCourseRequestSchema,
  type DeleteCourseResponse,
  type CourseListItem,
  type CourseListResponse,
  type TeacherOrganizationsResponse,
  type UpdateCourseRequest,
  type UpdateCourseResponse,
} from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiDelete, apiPatch, fetcher } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
type OrganizationItem = TeacherOrganizationsResponse['organizations'][number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function getStatusClass(status: CourseListItem['status']) {
  if (status === 'published') {
    return 'bg-primary-100 text-primary-base ring-primary-200';
  }

  if (status === 'archived') {
    return 'bg-error/10 text-error ring-error/20';
  }

  return 'bg-gray-100 text-gray-700 ring-gray-200';
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

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateCourseRequest>({
    resolver: zodResolver(UpdateCourseRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'draft',
    },
  });
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

    reset({
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

    reset({
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

  async function handleUpdateCourse(values: UpdateCourseRequest) {
    if (!editingCourse || !organizationId) {
      return;
    }

    setIsSaving(true);

    const payload: UpdateCourseRequest = {
      title: values.title?.trim(),
      description:
        typeof values.description === 'string' && values.description.trim()
          ? values.description.trim()
          : null,
      status: values.status,
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

      setEditingCourse(null);
      reset({
        title: '',
        description: '',
        status: 'draft',
      });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to update course.';

      if (!(error instanceof ApiError)) {
        console.error('Failed to update course:', error);
      }

      toast.error(message);
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
      await apiDelete<DeleteCourseResponse>(
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
      const message =
        error instanceof ApiError ? error.message : 'Failed to delete course.';

      if (!(error instanceof ApiError)) {
        console.error('Failed to delete course:', error);
      }

      toast.error(message);
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
            const detailsId = `course-details-${course.id}`;

            const toggleCourseDetails = () => {
              setExpandedCourseId(isExpanded ? null : course.id);
            };

            return (
              <Card
                key={course.id}
                role="button"
                tabIndex={0}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${course.title} details`}
                aria-expanded={isExpanded}
                aria-controls={detailsId}
                onClick={toggleCourseDetails}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleCourseDetails();
                  }
                }}
                className="group cursor-pointer rounded-3xl border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-2"
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
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${course.title} details`}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCourseDetails();
                      }}
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
                    <div
                      id={detailsId}
                      className="space-y-4 border-t border-gray-100 pt-5"
                    >
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

      <Dialog
        open={Boolean(editingCourse)}
        onOpenChange={(open) => {
          if (!open) {
            closeUpdateModal();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Course</DialogTitle>
            <DialogDescription>
              Edit course information and save changes.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(handleUpdateCourse)}
            className="space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Course Title
              </label>

              <input
                {...register('title')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />

              {errors.title?.message && (
                <p className="mt-1 text-xs text-error">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                {...register('description')}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />

              {errors.description?.message && (
                <p className="mt-1 text-xs text-error">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                {...register('status')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>

              {errors.status?.message && (
                <p className="mt-1 text-xs text-error">
                  {errors.status.message}
                </p>
              )}
            </div>

            <DialogFooter>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingCourse)}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteModal();
          }
        }}
      >
        <DialogContent className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
            <Trash2 className="h-6 w-6 text-error" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-center">Delete course?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">
                {deletingCourse?.title}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-center">
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
              className="rounded-lg border border-error bg-error px-4 py-2 text-sm font-medium text-white transition hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

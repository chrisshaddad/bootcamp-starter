'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type TeacherAssignmentResponse,
  type TeacherCourseListResponse,
  updateTeacherAssignmentRequestSchema,
} from '@repo/contracts';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiPatch, fetcher } from '@/lib/api';

type UpdateAssignmentFormInput = z.input<
  typeof updateTeacherAssignmentRequestSchema
>;

type UpdateAssignmentFormOutput = z.output<
  typeof updateTeacherAssignmentRequestSchema
>;

function toDateTimeLocal(value: Date | string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

function nullableTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function nullableIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export default function EditTeacherAssignmentPage() {
  const router = useRouter();
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;

  const [courses, setCourses] = useState<TeacherCourseListResponse>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAssignmentFormInput, unknown, UpdateAssignmentFormOutput>({
    resolver: zodResolver(updateTeacherAssignmentRequestSchema),
  });

  useEffect(() => {
    async function loadPageData() {
      setIsLoadingPage(true);
      setLoadError(null);

      try {
        const [assignment, courseList] = await Promise.all([
          fetcher<TeacherAssignmentResponse>(
            `/teacher/assignments/${assignmentId}`,
          ),
          fetcher<TeacherCourseListResponse>('/teacher/courses'),
        ]);

        setCourses(courseList);

        reset({
          courseId: assignment.courseId,
          title: assignment.title,
          instructions: assignment.instructions ?? '',
          maxScore: assignment.maxScore,
          startsAt: toDateTimeLocal(assignment.startsAt),
          dueAt: toDateTimeLocal(assignment.dueAt),
          endsAt: toDateTimeLocal(assignment.endsAt),
          noteToStudents: assignment.noteToStudents ?? '',
          status: assignment.status,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          setLoadError(error.message);
        } else {
          setLoadError('Failed to load assignment.');
        }
      } finally {
        setIsLoadingPage(false);
      }
    }

    if (assignmentId) {
      void loadPageData();
    }
  }, [assignmentId, reset]);

  async function onSubmit(data: UpdateAssignmentFormOutput) {
    try {
      await apiPatch<TeacherAssignmentResponse>(
        `/teacher/assignments/${assignmentId}`,
        data,
      );

      toast.success('Assignment updated successfully.');
      router.push(`/teacher/assignments/${assignmentId}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update assignment. Please try again.');
      }
    }
  }

  if (isLoadingPage) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <Link
          href={`/teacher/assignments/${assignmentId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-red-600">{loadError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/teacher/assignments/${assignmentId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assignment
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Assignment</h1>

        <p className="mt-1 text-sm text-gray-500">
          Update the assignment details and visibility.
        </p>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Assignment details</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="courseId">Course</Label>

                <select
                  id="courseId"
                  aria-invalid={Boolean(errors.courseId)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('courseId')}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>

                {errors.courseId?.message && (
                  <p className="text-sm text-red-600">
                    {errors.courseId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>

                <Input
                  id="title"
                  maxLength={150}
                  aria-invalid={Boolean(errors.title)}
                  {...register('title')}
                />

                {errors.title?.message && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="instructions">Instructions</Label>

                <textarea
                  id="instructions"
                  rows={6}
                  aria-invalid={Boolean(errors.instructions)}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('instructions', {
                    setValueAs: nullableTrimmedString,
                  })}
                />

                {errors.instructions?.message && (
                  <p className="text-sm text-red-600">
                    {errors.instructions.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxScore">Maximum score</Label>

                <Input
                  id="maxScore"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  aria-invalid={Boolean(errors.maxScore)}
                  {...register('maxScore', {
                    valueAsNumber: true,
                  })}
                />

                {errors.maxScore?.message && (
                  <p className="text-sm text-red-600">
                    {errors.maxScore.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>

                <select
                  id="status"
                  aria-invalid={Boolean(errors.status)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('status')}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>

                {errors.status?.message && (
                  <p className="text-sm text-red-600">
                    {errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startsAt">Start date</Label>

                <Input
                  id="startsAt"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.startsAt)}
                  {...register('startsAt', {
                    setValueAs: nullableIsoDate,
                  })}
                />

                {errors.startsAt?.message && (
                  <p className="text-sm text-red-600">
                    {errors.startsAt.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueAt">Due date</Label>

                <Input
                  id="dueAt"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.dueAt)}
                  {...register('dueAt', {
                    setValueAs: nullableIsoDate,
                  })}
                />

                {errors.dueAt?.message && (
                  <p className="text-sm text-red-600">{errors.dueAt.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endsAt">End date</Label>

                <Input
                  id="endsAt"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.endsAt)}
                  {...register('endsAt', {
                    setValueAs: nullableIsoDate,
                  })}
                />

                {errors.endsAt?.message && (
                  <p className="text-sm text-red-600">
                    {errors.endsAt.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="noteToStudents">Note to students</Label>

                <textarea
                  id="noteToStudents"
                  rows={3}
                  aria-invalid={Boolean(errors.noteToStudents)}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('noteToStudents', {
                    setValueAs: nullableTrimmedString,
                  })}
                />

                {errors.noteToStudents?.message && (
                  <p className="text-sm text-red-600">
                    {errors.noteToStudents.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link href={`/teacher/assignments/${assignmentId}`}>
                  Cancel
                </Link>
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

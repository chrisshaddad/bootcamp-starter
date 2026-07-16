'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTeacherAssignmentRequestSchema,
  type TeacherCourseListResponse,
} from '@repo/contracts';
import { ArrowLeft, BookOpen, Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiPost, fetcher } from '@/lib/api';

type CreateAssignmentFormInput = z.input<
  typeof createTeacherAssignmentRequestSchema
>;

type CreateAssignmentFormOutput = z.output<
  typeof createTeacherAssignmentRequestSchema
>;

export default function NewTeacherAssignmentPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<TeacherCourseListResponse>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateAssignmentFormInput, unknown, CreateAssignmentFormOutput>({
    resolver: zodResolver(createTeacherAssignmentRequestSchema),
    defaultValues: {
      courseId: '',
      title: '',
      instructions: undefined,
      maxScore: 100,
      startsAt: undefined,
      dueAt: undefined,
      endsAt: undefined,
      noteToStudents: undefined,
      status: 'draft',
    },
  });

  useEffect(() => {
    async function loadCourses() {
      setIsLoadingCourses(true);

      try {
        const data =
          await fetcher<TeacherCourseListResponse>('/teacher/courses');

        setCourses(data);

        if (data[0]) {
          setValue('courseId', data[0].id, {
            shouldValidate: true,
          });
        }
      } catch (error) {
        if (error instanceof ApiError) {
          toast.error(error.message);
        } else {
          toast.error('Failed to load courses. Please try again.');
        }
      } finally {
        setIsLoadingCourses(false);
      }
    }

    void loadCourses();
  }, [setValue]);

  async function onSubmit(data: CreateAssignmentFormOutput) {
    try {
      await apiPost('/teacher/assignments', data);

      toast.success('Assignment created successfully.');
      router.push('/teacher/assignments');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create assignment. Please try again.');
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/teacher/assignments"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignments
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Assignment
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Add an assignment to one of your courses.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <BookOpen className="h-5 w-5 text-emerald-700" />
            </div>

            <div>
              <CardTitle>Assignment details</CardTitle>

              <p className="mt-1 text-sm text-gray-500">
                Fields marked as required must be completed.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
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
                  disabled={isLoadingCourses || courses.length === 0}
                  aria-invalid={Boolean(errors.courseId)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                  {...register('courseId')}
                >
                  {isLoadingCourses && (
                    <option value="">Loading courses...</option>
                  )}

                  {!isLoadingCourses && courses.length === 0 && (
                    <option value="">No courses available</option>
                  )}

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
                  placeholder="Example: Algebra Homework"
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
                  placeholder="Explain what students need to complete..."
                  rows={6}
                  aria-invalid={Boolean(errors.instructions)}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('instructions', {
                    setValueAs: (value: string) => {
                      const trimmedValue = value.trim();
                      return trimmedValue || undefined;
                    },
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
                <Label htmlFor="dueAt">Due date</Label>

                <Input
                  id="dueAt"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.dueAt)}
                  {...register('dueAt', {
                    setValueAs: (value: string) =>
                      value ? new Date(value).toISOString() : undefined,
                  })}
                />

                {errors.dueAt?.message && (
                  <p className="text-sm text-red-600">{errors.dueAt.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="noteToStudents">Note to students</Label>

                <textarea
                  id="noteToStudents"
                  placeholder="Optional note visible to students..."
                  rows={3}
                  aria-invalid={Boolean(errors.noteToStudents)}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('noteToStudents', {
                    setValueAs: (value: string) => {
                      const trimmedValue = value.trim();
                      return trimmedValue || undefined;
                    },
                  })}
                />

                {errors.noteToStudents?.message && (
                  <p className="text-sm text-red-600">
                    {errors.noteToStudents.message}
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
                </select>

                {errors.status?.message && (
                  <p className="text-sm text-red-600">
                    {errors.status.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link href="/teacher/assignments">Cancel</Link>
              </Button>

              <Button
                type="submit"
                disabled={
                  isSubmitting || isLoadingCourses || courses.length === 0
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Assignment
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

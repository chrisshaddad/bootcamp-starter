'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, Save } from 'lucide-react';
import type {
  CreateTeacherAssignmentRequest,
  TeacherCourseListResponse,
} from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetcher, apiPost } from '@/lib/api';

type AssignmentStatus = 'draft' | 'published';

export default function NewTeacherAssignmentPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<TeacherCourseListResponse>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [dueAt, setDueAt] = useState('');
  const [noteToStudents, setNoteToStudents] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>('draft');

  useEffect(() => {
    async function loadCourses() {
      setIsLoadingCourses(true);
      setError(null);

      try {
        const data =
          await fetcher<TeacherCourseListResponse>('/teacher/courses');

        setCourses(data);

        if (data.length > 0 && data[0]) {
          setCourseId(data[0].id);
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Failed to load courses.',
        );
      } finally {
        setIsLoadingCourses(false);
      }
    }

    loadCourses();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedMaxScore = Number(maxScore);

    if (!courseId) {
      setError('Select a course.');
      return;
    }

    if (!title.trim()) {
      setError('Enter an assignment title.');
      return;
    }

    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      setError('Maximum score must be greater than zero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const body: CreateTeacherAssignmentRequest = {
        courseId,
        title: title.trim(),
        maxScore: parsedMaxScore,
        status,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
        ...(noteToStudents.trim()
          ? { noteToStudents: noteToStudents.trim() }
          : {}),
      };

      await apiPost('/teacher/assignments', body);

      router.push('/teacher/assignments');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to create assignment.',
      );
    } finally {
      setIsSubmitting(false);
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="course">Course</Label>

                <select
                  id="course"
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  disabled={isLoadingCourses || courses.length === 0}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Algebra Homework"
                  maxLength={150}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="instructions">Instructions</Label>
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Explain what students need to complete..."
                  rows={6}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxScore">Maximum score</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min="1"
                  step="1"
                  value={maxScore}
                  onChange={(event) => setMaxScore(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueAt">Due date</Label>
                <Input
                  id="dueAt"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="noteToStudents">Note to students</Label>
                <textarea
                  id="noteToStudents"
                  value={noteToStudents}
                  onChange={(event) => setNoteToStudents(event.target.value)}
                  placeholder="Optional note visible to students..."
                  rows={3}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>

                <select
                  id="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as AssignmentStatus)
                  }
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
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

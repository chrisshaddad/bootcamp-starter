'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { TeacherAssignmentResponse } from '@repo/contracts';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Edit,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiDelete, fetcher } from '@/lib/api';

type DeleteAssignmentResponse = {
  message: string;
};

function formatDate(value: Date | string | null) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusClasses(status: TeacherAssignmentResponse['status']) {
  switch (status) {
    case 'published':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'closed':
      return 'border-gray-300 bg-gray-100 text-gray-700';
    case 'draft':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

export default function TeacherAssignmentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;

  const [assignment, setAssignment] =
    useState<TeacherAssignmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignment() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetcher<TeacherAssignmentResponse>(
          `/teacher/assignments/${assignmentId}`,
        );

        setAssignment(data);
      } catch (error) {
        if (error instanceof ApiError) {
          setError(error.message);
        } else {
          setError('Failed to load assignment.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (assignmentId) {
      void loadAssignment();
    }
  }, [assignmentId]);

  async function handleDelete() {
    if (!assignment) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${assignment.title}"? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await apiDelete<DeleteAssignmentResponse>(
        `/teacher/assignments/${assignment.id}`,
      );

      toast.success(response.message);
      router.push('/teacher/assignments');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to delete assignment. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <Link
          href="/teacher/assignments"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignments
        </Link>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-red-600">
              {error ?? 'Assignment was not found.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/assignments"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assignments
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {assignment.title}
            </h1>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(
                assignment.status,
              )}`}
            >
              {assignment.status}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            {assignment.course.title}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href={`/teacher/assignments/${assignment.id}/submissions`}>
              <ClipboardList className="h-4 w-4" />
              View submissions
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href={`/teacher/assignments/${assignment.id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assignment details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-gray-900">
                Instructions
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {assignment.instructions || 'No instructions provided.'}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-900">
                Note to students
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {assignment.noteToStudents || 'No note provided.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scoring</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-gray-500">Maximum score</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {assignment.maxScore}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Starts
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(assignment.startsAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Due
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(assignment.dueAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Ends
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(assignment.endsAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

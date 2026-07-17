'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import type { TeacherAssignmentListResponse } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';

function getStatusClasses(
  status: TeacherAssignmentListResponse[number]['status'],
) {
  switch (status) {
    case 'published':
      return 'border-primary-200 bg-primary-100 text-primary-base';

    case 'closed':
      return 'border-gray-300 bg-gray-100 text-gray-700';

    case 'draft':
    default:
      return 'border-gray-300 bg-gray-50 text-gray-700';
  }
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<TeacherAssignmentListResponse>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignments() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetcher<TeacherAssignmentListResponse>(
          '/teacher/assignments',
        );

        setAssignments(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load assignments.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadAssignments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>

          <p className="mt-1 text-sm text-gray-500">
            Create assignments and review student submissions.
          </p>
        </div>

        <Button asChild>
          <Link href="/teacher/assignments/new">
            <Plus className="h-4 w-4" />
            New Assignment
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      )}

      {!isLoading && error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && assignments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardList className="h-10 w-10 text-gray-400" />

            <div>
              <p className="font-medium text-gray-900">No assignments yet</p>

              <p className="mt-1 text-sm text-gray-500">
                Create your first assignment to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && assignments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/teacher/assignments/${assignment.id}`}
              className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-base focus:ring-offset-2"
            >
              <Card className="h-full border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">
                        {assignment.title}
                      </CardTitle>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {assignment.course.title}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getStatusClasses(
                        assignment.status,
                      )}`}
                    >
                      {assignment.status}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="line-clamp-3 min-h-15 text-sm leading-5 text-gray-600">
                    {assignment.instructions || 'No instructions provided.'}
                  </p>

                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span className="text-gray-500">
                      {assignment._count.submissions}{' '}
                      {assignment._count.submissions === 1
                        ? 'submission'
                        : 'submissions'}
                    </span>

                    <span className="font-medium text-gray-900">
                      {assignment.maxScore} points
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

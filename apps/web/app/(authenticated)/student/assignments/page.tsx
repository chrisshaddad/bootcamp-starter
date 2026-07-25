'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  StudentAssignmentListItemResponse,
  StudentAssignmentListResponse,
} from '@repo/contracts';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, fetcher } from '@/lib/api';

function formatDate(value: string | null): string {
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

function getAvailabilityClasses(
  availability: StudentAssignmentListItemResponse['availability'],
): string {
  switch (availability) {
    case 'open':
      return 'bg-emerald-100 text-emerald-700';

    case 'upcoming':
      return 'bg-amber-100 text-amber-700';

    case 'closed':
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getSubmissionLabel(
  assignment: StudentAssignmentListItemResponse,
): string {
  if (!assignment.submission) {
    return 'Not submitted';
  }

  if (assignment.submission.status === 'graded') {
    return `Graded: ${assignment.submission.score ?? 0} / ${
      assignment.maxScore
    }`;
  }

  if (assignment.submission.status === 'late') {
    return 'Submitted late';
  }

  return 'Submitted';
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<StudentAssignmentListResponse>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignments() {
      try {
        const data = await fetcher<StudentAssignmentListResponse>(
          '/student/assignments',
        );

        setAssignments(data);
      } catch (error) {
        if (error instanceof ApiError) {
          setError(error.message);
        } else {
          setError('Failed to load assignments.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadAssignments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-base" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>

        <p className="mt-2 text-sm text-gray-500">
          View and submit assignments from your enrolled courses.
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {!error && assignments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardList className="h-10 w-10 text-gray-400" />

            <div>
              <p className="font-medium text-gray-900">
                No assignments available
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Published assignments from your courses will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && assignments.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {assignments.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/student/assignments/${assignment.id}`}
              className="block"
            >
              <Card className="h-full transition hover:border-primary-base hover:shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{assignment.title}</CardTitle>

                      <p className="mt-2 text-sm text-gray-500">
                        {assignment.course.title}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getAvailabilityClasses(
                        assignment.availability,
                      )}`}
                    >
                      {assignment.availability}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                    {assignment.instructions || 'No instructions provided.'}
                  </p>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Due: {formatDate(assignment.dueAt)}
                    </span>

                    <span>Maximum score: {assignment.maxScore}</span>
                  </div>

                  <div className="border-t pt-4">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      {assignment.submission && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}

                      {getSubmissionLabel(assignment)}
                    </p>
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

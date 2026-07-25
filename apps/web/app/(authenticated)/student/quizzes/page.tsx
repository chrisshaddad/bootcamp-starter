'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StudentQuizListResponse } from '@repo/contracts';
import { CalendarClock, Clock3, FileQuestion, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, fetcher } from '@/lib/api';

function formatDate(value: string | null): string {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<StudentQuizListResponse>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function loadQuizzes() {
      setIsLoading(true);
      setLoadFailed(false);

      try {
        const data = await fetcher<StudentQuizListResponse>('/student/quizzes');

        setQuizzes(data);
      } catch (error) {
        setLoadFailed(true);

        if (error instanceof ApiError) {
          toast.error(error.message);
        } else {
          toast.error('Failed to load quizzes.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadQuizzes();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Quizzes</h1>

        <p className="mt-1 text-sm text-gray-500">
          View quizzes and exams available in your enrolled courses.
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
        </div>
      ) : loadFailed ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Could not load quizzes
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Something went wrong while loading your quizzes.
            </p>

            <button
              type="button"
              className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </CardContent>
        </Card>
      ) : quizzes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <FileQuestion className="h-10 w-10 text-gray-400" />

            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No quizzes available
            </h2>

            <p className="mt-1 max-w-md text-sm text-gray-500">
              You currently have no published quizzes or exams in your active
              courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/student/quizzes/${quiz.id}`}
              className="block"
            >
              <Card className="h-full border-gray-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>

                      <p className="mt-1 text-sm text-gray-500">
                        {quiz.course.title}
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                      {quiz.availability}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {quiz.durationMinutes} minutes
                    </span>

                    <span>{quiz.questionCount} questions</span>

                    <span>{quiz.maxScore} points</span>

                    <span className="capitalize">{quiz.type}</span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500">
                    <p className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" />
                      Starts: {formatDate(quiz.startsAt)}
                    </p>

                    <p>Ends: {formatDate(quiz.endsAt)}</p>

                    <p className="capitalize">
                      Attempt status: {quiz.attemptStatus.replace('_', ' ')}
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

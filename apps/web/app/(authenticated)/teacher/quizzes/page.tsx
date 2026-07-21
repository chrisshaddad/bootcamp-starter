'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TeacherQuizListResponse } from '@repo/contracts';
import { Clock3, FileQuestion, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, fetcher } from '@/lib/api';

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState<TeacherQuizListResponse>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function loadQuizzes() {
      setIsLoading(true);
      setLoadFailed(false);

      try {
        const data = await fetcher<TeacherQuizListResponse>('/teacher/quizzes');

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quizzes</h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage timed quizzes and exams.
          </p>
        </div>

        <Button asChild>
          <Link href="/teacher/quizzes/new">
            <Plus className="h-4 w-4" />
            Create Quiz
          </Link>
        </Button>
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
              Something went wrong while loading the quizzes.
            </p>

            <Button
              type="button"
              className="mt-5"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : quizzes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <FileQuestion className="h-10 w-10 text-gray-400" />

            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No quizzes yet
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create your first timed quiz or exam.
            </p>

            <Button asChild className="mt-5">
              <Link href="/teacher/quizzes/new">
                <Plus className="h-4 w-4" />
                Create Quiz
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/teacher/quizzes/${quiz.id}`}
              className="block"
            >
              <Card className="h-full border-gray-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>

                      <p className="mt-1 text-sm text-gray-500">
                        {quiz.course.title}
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                      {quiz.status}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {quiz.durationMinutes} minutes
                    </span>

                    <span>{quiz._count.quizQuestions} questions</span>

                    <span>{quiz.maxScore} points</span>

                    <span className="capitalize">{quiz.type}</span>
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

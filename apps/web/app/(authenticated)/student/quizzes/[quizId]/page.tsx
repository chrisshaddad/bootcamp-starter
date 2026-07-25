'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type {
  StartQuizAttemptResponse,
  StudentQuizResponse,
} from '@repo/contracts';
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiPost, fetcher } from '@/lib/api';

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function StudentQuizDetailPage() {
  const params = useParams<{ quizId: string }>();
  const router = useRouter();
  const quizId = params.quizId;

  const [quiz, setQuiz] = useState<StudentQuizResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      setIsLoading(true);
      setLoadFailed(false);

      try {
        const data = await fetcher<StudentQuizResponse>(
          `/student/quizzes/${quizId}`,
        );

        setQuiz(data);
      } catch (error) {
        setLoadFailed(true);

        if (error instanceof ApiError) {
          toast.error(error.message);
        } else {
          toast.error('Failed to load quiz.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadQuiz();
  }, [quizId]);

  async function startQuiz() {
    setIsStarting(true);

    try {
      await apiPost<StartQuizAttemptResponse>(
        `/student/quizzes/${quizId}/start`,
      );

      toast.success('Quiz attempt started.');

      router.push(`/student/quizzes/${quizId}/attempt`);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);

        if (
          error.status === 409 &&
          (error.message.toLowerCase().includes('already') ||
            error.message.toLowerCase().includes('attempt'))
        ) {
          router.push(`/student/quizzes/${quizId}/attempt`);
        }
      } else {
        toast.error('Failed to start the quiz.');
      }
    } finally {
      setIsStarting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
      </div>
    );
  }

  if (loadFailed || !quiz) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="ghost">
          <Link href="/student/quizzes">
            <ArrowLeft className="h-4 w-4" />
            Back to quizzes
          </Link>
        </Button>

        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Could not load quiz
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              The quiz may not exist, or you may not have access to it.
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
      </div>
    );
  }

  const canStart =
    quiz.availability === 'available' && quiz.attemptStatus === 'none';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost">
        <Link href="/student/quizzes">
          <ArrowLeft className="h-4 w-4" />
          Back to quizzes
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{quiz.title}</CardTitle>

              <p className="mt-1 text-sm text-gray-500">{quiz.course.title}</p>
            </div>

            <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
              {quiz.availability}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-gray-500">Duration</p>

              <p className="mt-1 flex items-center gap-2 font-medium">
                <Clock3 className="h-4 w-4" />
                {quiz.durationMinutes} minutes
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-gray-500">Questions</p>

              <p className="mt-1 flex items-center gap-2 font-medium">
                <FileQuestion className="h-4 w-4" />
                {quiz.questions.length}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-gray-500">Maximum score</p>

              <p className="mt-1 font-medium">{quiz.maxScore} points</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-gray-500">Attempt status</p>

              <p className="mt-1 font-medium capitalize">
                {quiz.attemptStatus.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <CalendarClock className="h-4 w-4" />
              Schedule
            </p>

            <div className="space-y-1 text-sm text-gray-600">
              <p>Starts: {formatDate(quiz.startsAt)}</p>
              <p>Due: {formatDate(quiz.dueAt)}</p>
              <p>Ends: {formatDate(quiz.endsAt)}</p>
            </div>
          </div>

          {quiz.instructions && (
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Instructions
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                {quiz.instructions}
              </p>
            </div>
          )}

          {quiz.noteToStudents && (
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Note from teacher
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                {quiz.noteToStudents}
              </p>
            </div>
          )}

          <div className="border-t pt-6">
            {quiz.attemptStatus === 'submitted' ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-green-700">Quiz submitted</p>

                  {quiz.attempt && (
                    <p className="mt-1 text-sm text-gray-600">
                      Score: {quiz.attempt.autoScore ?? 0} /{' '}
                      {quiz.attempt.totalPoints ?? quiz.maxScore}
                    </p>
                  )}
                </div>

                <Button asChild>
                  <Link href={`/student/quizzes/${quizId}/attempt`}>
                    View Result
                  </Link>
                </Button>
              </div>
            ) : quiz.attemptStatus === 'in_progress' ? (
              <Button asChild>
                <Link href={`/student/quizzes/${quizId}/attempt`}>
                  Continue Quiz
                </Link>
              </Button>
            ) : quiz.attemptStatus === 'expired' ? (
              <p className="text-sm text-red-700">
                Your attempt has expired and can no longer be submitted.
              </p>
            ) : canStart ? (
              <Button
                type="button"
                disabled={isStarting}
                onClick={() => void startQuiz()}
              >
                {isStarting && <Loader2 className="h-4 w-4 animate-spin" />}

                {isStarting ? 'Starting...' : 'Start Quiz'}
              </Button>
            ) : quiz.availability === 'upcoming' ? (
              <p className="text-sm text-amber-700">
                This quiz is not available yet.
              </p>
            ) : quiz.availability === 'closed' ? (
              <p className="text-sm text-gray-600">
                This quiz is closed and can no longer be started.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

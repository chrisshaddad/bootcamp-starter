'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type {
  StudentQuizResponse,
  SubmitQuizAttemptRequest,
  SubmitQuizAttemptResponse,
} from '@repo/contracts';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiPost, fetcher } from '@/lib/api';

function formatRemainingTime(totalSeconds: number): string {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}`;
}

function calculateRemainingSeconds(expiresAt: string): number {
  const difference = new Date(expiresAt).getTime() - Date.now();

  return Math.max(Math.ceil(difference / 1000), 0);
}

export default function StudentQuizAttemptPage() {
  const params = useParams<{ quizId: string }>();
  const router = useRouter();
  const quizId = params.quizId;

  const [quiz, setQuiz] = useState<StudentQuizResponse | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submissionResult, setSubmissionResult] =
    useState<SubmitQuizAttemptResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadQuiz = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);

    try {
      const data = await fetcher<StudentQuizResponse>(
        `/student/quizzes/${quizId}`,
      );

      setQuiz(data);

      if (data.attemptStatus === 'none' || !data.attempt) {
        toast.error('Start this quiz before opening the attempt page.');
        router.replace(`/student/quizzes/${quizId}`);
        return;
      }

      if (data.attemptStatus === 'submitted') {
        setSubmissionResult({
          id: data.attempt.id,
          assignmentId: data.id,
          submittedAt: data.attempt.submittedAt ?? new Date().toISOString(),
          autoScore: data.attempt.autoScore ?? 0,
          totalPoints: data.attempt.totalPoints ?? data.maxScore,
          status: 'submitted',
        });

        return;
      }

      setRemainingSeconds(calculateRemainingSeconds(data.attempt.expiresAt));
    } catch (error) {
      setLoadFailed(true);

      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to load the quiz attempt.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [quizId, router]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  useEffect(() => {
    if (
      !quiz?.attempt ||
      quiz.attemptStatus !== 'in_progress' ||
      submissionResult
    ) {
      return;
    }

    const updateTimer = () => {
      const seconds = calculateRemainingSeconds(quiz.attempt!.expiresAt);

      setRemainingSeconds(seconds);
    };

    updateTimer();

    const timer = window.setInterval(updateTimer, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [quiz, submissionResult]);

  const answeredCount = useMemo(
    () => Object.keys(selectedAnswers).length,
    [selectedAnswers],
  );

  const allQuestionsAnswered =
    quiz !== null &&
    quiz.questions.length > 0 &&
    answeredCount === quiz.questions.length;

  const attemptExpired =
    quiz?.attemptStatus === 'expired' ||
    (quiz?.attemptStatus === 'in_progress' && remainingSeconds <= 0);

  function selectAnswer(questionId: string, optionId: string) {
    if (attemptExpired || submissionResult || isSubmitting) {
      return;
    }

    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: optionId,
    }));
  }

  async function submitAttempt() {
    if (!quiz || !quiz.attempt) {
      toast.error('No active quiz attempt was found.');
      return;
    }

    if (attemptExpired) {
      toast.error('The time limit for this quiz has expired.');
      return;
    }

    if (!allQuestionsAnswered) {
      toast.error('Answer every question before submitting.');
      return;
    }

    const shouldSubmit = window.confirm(
      'Submit your answers? You will not be able to change them afterward.',
    );

    if (!shouldSubmit) {
      return;
    }

    const payload: SubmitQuizAttemptRequest = {
      answers: quiz.questions.map((question) => ({
        questionId: question.id,
        selectedOptionId: selectedAnswers[question.id]!,
      })),
    };

    setIsSubmitting(true);

    try {
      const result = await apiPost<SubmitQuizAttemptResponse>(
        `/student/quizzes/${quizId}/submit`,
        payload,
      );

      setSubmissionResult(result);

      setQuiz((currentQuiz) => {
        if (!currentQuiz || !currentQuiz.attempt) {
          return currentQuiz;
        }

        return {
          ...currentQuiz,
          attemptStatus: 'submitted',
          attempt: {
            ...currentQuiz.attempt,
            submittedAt: result.submittedAt,
            autoScore: result.autoScore,
            totalPoints: result.totalPoints,
          },
        };
      });

      toast.success('Quiz submitted successfully.');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);

        if (
          error.status === 400 &&
          error.message.toLowerCase().includes('expired')
        ) {
          setRemainingSeconds(0);
        }
      } else {
        toast.error('Failed to submit the quiz.');
      }
    } finally {
      setIsSubmitting(false);
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
          <Link href={`/student/quizzes/${quizId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to quiz
          </Link>
        </Button>

        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <AlertCircle className="h-9 w-9 text-red-500" />

            <h2 className="mt-3 text-lg font-semibold text-gray-900">
              Could not load attempt
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              The attempt may not exist, or you may not have access to it.
            </p>

            <Button
              type="button"
              className="mt-5"
              onClick={() => void loadQuiz()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submissionResult) {
    const percentage =
      submissionResult.totalPoints > 0
        ? Math.round(
            (submissionResult.autoScore / submissionResult.totalPoints) * 100,
          )
        : 0;

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost">
          <Link href="/student/quizzes">
            <ArrowLeft className="h-4 w-4" />
            Back to quizzes
          </Link>
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-600" />

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Quiz submitted
            </h1>

            <p className="mt-2 text-sm text-gray-500">{quiz.title}</p>

            <div className="mt-8 rounded-xl border px-10 py-6">
              <p className="text-sm text-gray-500">Your score</p>

              <p className="mt-2 text-4xl font-bold text-gray-900">
                {submissionResult.autoScore} / {submissionResult.totalPoints}
              </p>

              <p className="mt-2 text-lg font-medium text-gray-600">
                {percentage}%
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href={`/student/quizzes/${quizId}`}>
                  View quiz details
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/student/quizzes">All quizzes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={`/student/quizzes/${quizId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to quiz
          </Link>
        </Button>

        <div
          className={`flex w-fit items-center gap-2 rounded-lg border px-4 py-2 font-medium ${
            remainingSeconds <= 60
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'bg-white text-gray-900'
          }`}
        >
          <Clock3 className="h-4 w-4" />
          {formatRemainingTime(remainingSeconds)}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>

          <p className="text-sm text-gray-500">
            Answered {answeredCount} of {quiz.questions.length} questions
          </p>
        </CardHeader>
      </Card>

      {attemptExpired && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />

            <div>
              <h2 className="font-semibold text-red-900">Time limit expired</h2>

              <p className="mt-1 text-sm text-red-700">
                This attempt can no longer be submitted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {quiz.questions.map((question, questionIndex) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg">
                  {questionIndex + 1}. {question.questionText}
                </CardTitle>

                <span className="shrink-0 text-sm text-gray-500">
                  {question.points} {question.points === 1 ? 'point' : 'points'}
                </span>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {question.options.map((option) => {
                  const isSelected = selectedAnswers[question.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={attemptExpired || isSubmitting}
                      onClick={() => selectAnswer(question.id, option.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-400'
                        }`}
                      >
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </span>

                      <span className="text-sm font-medium text-gray-900">
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            {allQuestionsAnswered
              ? 'All questions are answered.'
              : `${quiz.questions.length - answeredCount} questions remaining.`}
          </p>

          <Button
            type="button"
            disabled={!allQuestionsAnswered || attemptExpired || isSubmitting}
            onClick={() => void submitAttempt()}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}

            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

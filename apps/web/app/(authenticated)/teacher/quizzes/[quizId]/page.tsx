'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { TeacherQuizResponse } from '@repo/contracts';
import { ArrowLeft, Clock3, Edit, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiDelete, fetcher } from '@/lib/api';

export default function TeacherQuizDetailPage() {
  const params = useParams<{ quizId: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<TeacherQuizResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const quizId = params.quizId;

  useEffect(() => {
    async function loadQuiz() {
      try {
        const data = await fetcher<TeacherQuizResponse>(
          `/teacher/quizzes/${quizId}`,
        );

        setQuiz(data);
      } catch (error) {
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

  async function deleteQuiz() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this quiz? This action cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiDelete(`/teacher/quizzes/${quizId}`);

      toast.success('Quiz deleted successfully.');
      router.push('/teacher/quizzes');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to delete quiz.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <h1 className="text-xl font-semibold">Quiz not found</h1>

            <Button asChild className="mt-4">
              <Link href="/teacher/quizzes">Back to quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/teacher/quizzes"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to quizzes
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>

            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
              {quiz.status}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-500">{quiz.course.title}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/teacher/quizzes/${quiz.id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          </Button>

          <Button
            variant="destructive"
            onClick={deleteQuiz}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz information</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="mt-1 font-medium capitalize">{quiz.type}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-medium">
              <Clock3 className="h-4 w-4" />
              {quiz.durationMinutes} minutes
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Questions</p>
            <p className="mt-1 font-medium">{quiz.questions.length}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Total points</p>
            <p className="mt-1 font-medium">{quiz.maxScore}</p>
          </div>
        </CardContent>
      </Card>

      {(quiz.instructions || quiz.noteToStudents) && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {quiz.instructions && (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Instructions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                  {quiz.instructions}
                </p>
              </div>
            )}

            {quiz.noteToStudents && (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Note to students
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                  {quiz.noteToStudents}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Questions</h2>

        {quiz.questions.map((question, questionIndex) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base">
                  Question {questionIndex + 1}
                </CardTitle>

                <span className="text-sm font-medium text-gray-500">
                  {question.points} points
                </span>
              </div>
            </CardHeader>

            <CardContent>
              <p className="font-medium text-gray-900">
                {question.questionText}
              </p>

              <div className="mt-4 space-y-2">
                {question.options.map((option) => {
                  const isCorrect = option.id === question.correctOptionId;

                  return (
                    <div
                      key={option.id}
                      className={
                        isCorrect
                          ? 'rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900'
                          : 'rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700'
                      }
                    >
                      {option.text}

                      {isCorrect && (
                        <span className="ml-2 text-xs font-semibold">
                          Correct answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student attempts</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-gray-500">
            Attempts and grades will appear here after the student quiz-taking
            flow is implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

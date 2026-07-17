'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  gradeSubmissionRequestSchema,
  type GradeSubmissionRequest,
  type GradeSubmissionResponse,
  type TeacherAssignmentResponse,
  type TeacherSubmissionListItemResponse,
  type TeacherSubmissionListResponse,
} from '@repo/contracts';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  UserRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiPatch, fetcher } from '@/lib/api';

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusClasses(status: TeacherSubmissionListItemResponse['status']) {
  switch (status) {
    case 'graded':
      return 'border-primary-200 bg-primary-100 text-primary-base';

    case 'late':
      return 'border-error bg-error-light text-error';

    case 'submitted':
    default:
      return 'border-gray-300 bg-gray-100 text-gray-700';
  }
}

function formatAnswers(answers: unknown) {
  if (
    answers === null ||
    answers === undefined ||
    answers === '' ||
    (Array.isArray(answers) && answers.length === 0)
  ) {
    return null;
  }

  if (typeof answers === 'string') {
    return answers;
  }

  try {
    return JSON.stringify(answers, null, 2);
  } catch {
    return 'Unable to display structured answers.';
  }
}

type SubmissionGradeFormProps = {
  assignment: TeacherAssignmentResponse;
  submission: TeacherSubmissionListItemResponse;
  onSaved: () => Promise<void>;
};

function SubmissionGradeForm({
  assignment,
  submission,
  onSaved,
}: SubmissionGradeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GradeSubmissionRequest>({
    resolver: zodResolver(gradeSubmissionRequestSchema),
    defaultValues: {
      score: submission.grade?.score ?? 0,
      feedbackText:
        submission.grade?.feedbackText ?? submission.teacherNote ?? '',
    },
  });

  async function onSubmit(data: GradeSubmissionRequest) {
    if (data.score > assignment.maxScore) {
      toast.error(
        `Score cannot exceed the assignment maximum of ${assignment.maxScore}.`,
      );
      return;
    }

    try {
      await apiPatch<GradeSubmissionResponse>(
        `/teacher/submissions/${submission.id}/grade`,
        data,
      );

      toast.success(
        submission.grade
          ? 'Grade and feedback updated successfully.'
          : 'Submission graded successfully.',
      );

      await onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save the grade. Please try again.');
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
      noValidate
    >
      <div>
        <h3 className="font-medium text-gray-900">Grade and feedback</h3>

        <p className="mt-1 text-sm text-gray-500">
          Maximum score: {assignment.maxScore}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`score-${submission.id}`}>Score</Label>

        <Input
          id={`score-${submission.id}`}
          type="number"
          min="0"
          max={assignment.maxScore}
          step="0.01"
          aria-invalid={Boolean(errors.score)}
          {...register('score', {
            valueAsNumber: true,
          })}
        />

        {errors.score?.message && (
          <p className="text-sm text-error">{errors.score.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`feedback-${submission.id}`}>Feedback to student</Label>

        <textarea
          id={`feedback-${submission.id}`}
          rows={4}
          maxLength={3000}
          aria-invalid={Boolean(errors.feedbackText)}
          placeholder="Add feedback for this student..."
          className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-base focus:ring-2 focus:ring-primary-100"
          {...register('feedbackText', {
            setValueAs: (value: unknown) => {
              if (typeof value !== 'string') {
                return undefined;
              }

              const trimmed = value.trim();

              return trimmed || undefined;
            },
          })}
        />

        {errors.feedbackText?.message && (
          <p className="text-sm text-error">{errors.feedbackText.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {submission.grade ? 'Update grade' : 'Save grade'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function TeacherAssignmentSubmissionsPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;

  const [assignment, setAssignment] =
    useState<TeacherAssignmentResponse | null>(null);
  const [submissions, setSubmissions] = useState<TeacherSubmissionListResponse>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [assignmentData, submissionData] = await Promise.all([
        fetcher<TeacherAssignmentResponse>(
          `/teacher/assignments/${assignmentId}`,
        ),
        fetcher<TeacherSubmissionListResponse>(
          `/teacher/assignments/${assignmentId}/submissions`,
        ),
      ]);

      setAssignment(assignmentData);
      setSubmissions(submissionData);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError('Failed to load assignment submissions.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (assignmentId) {
      void loadPageData();
    }
  }, [assignmentId, loadPageData]);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-base" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <Link
          href={`/teacher/assignments/${assignmentId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-error">
              {error ?? 'Assignment was not found.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gradedCount = submissions.filter(
    (submission) => submission.status === 'graded',
  ).length;

  const awaitingReviewCount = submissions.length - gradedCount;

  return (
    <div className="space-y-6">
      <Link
        href={`/teacher/assignments/${assignment.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assignment
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Assignment Submissions
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {assignment.title}
          {' · '}
          {assignment.course.title}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total submissions</p>

            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {submissions.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Graded</p>

            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {gradedCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Awaiting review</p>

            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {awaitingReviewCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {submissions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <FileText className="h-10 w-10 text-gray-400" />

            <div>
              <p className="font-medium text-gray-900">No submissions yet</p>

              <p className="mt-1 text-sm text-gray-500">
                Student submissions will appear here when they are available.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {submissions.map((submission) => {
        const formattedAnswers = formatAnswers(submission.answers);

        return (
          <Card key={submission.id}>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <UserRound className="h-5 w-5 text-primary-base" />
                  </div>

                  <div>
                    <CardTitle className="text-lg">
                      {submission.student.name}
                    </CardTitle>

                    <p className="mt-1 text-sm text-gray-500">
                      {submission.student.email}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Submitted {formatDate(submission.submittedAt)}
                    </p>
                  </div>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(
                    submission.status,
                  )}`}
                >
                  {submission.status}
                </span>
              </div>
            </CardHeader>

            <CardContent className="grid gap-6 p-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Text response
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {submission.contentText || 'No text response provided.'}
                  </p>
                </div>

                {formattedAnswers && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Structured answers
                    </h3>

                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                      {formattedAnswers}
                    </pre>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Uploaded file
                  </h3>

                  {submission.fileUrl ? (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary-base hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open submitted file
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      No file was uploaded.
                    </p>
                  )}
                </div>

                {submission.grade && (
                  <div className="rounded-lg border border-primary-200 bg-primary-100 p-4">
                    <p className="text-sm font-medium text-primary-base">
                      Current grade
                    </p>

                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {submission.grade.score} / {assignment.maxScore}
                    </p>

                    <p className="mt-2 text-xs text-gray-600">
                      Graded {formatDate(submission.grade.gradedAt)}
                    </p>
                  </div>
                )}
              </div>

              <SubmissionGradeForm
                assignment={assignment}
                submission={submission}
                onSaved={loadPageData}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

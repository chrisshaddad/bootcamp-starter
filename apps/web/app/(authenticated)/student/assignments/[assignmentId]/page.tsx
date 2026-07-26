'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type {
  StudentAssignmentResponse,
  SubmitAssignmentResponse,
  UploadAssignmentFileResponse,
} from '@repo/contracts';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Loader2,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  API_URL,
  ApiError,
  apiPost,
  apiPostFormData,
  fetcher,
} from '@/lib/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

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
  availability: StudentAssignmentResponse['availability'],
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

function formatFileSize(size: number): string {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;

  const [assignment, setAssignment] =
    useState<StudentAssignmentResponse | null>(null);

  const [contentText, setContentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignment = useCallback(async () => {
    try {
      setError(null);

      const data = await fetcher<StudentAssignmentResponse>(
        `/student/assignments/${assignmentId}`,
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
  }, [assignmentId]);

  useEffect(() => {
    if (assignmentId) {
      void loadAssignment();
    }
  }, [assignmentId, loadAssignment]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('The selected file cannot exceed 10 MB.');
      event.target.value = '';
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(
        'Only PDF, DOCX, JPG, JPEG, PNG, GIF, and WEBP files are allowed.',
      );

      event.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  function clearSelectedFile() {
    setSelectedFile(null);

    const fileInput = document.getElementById(
      'assignmentFile',
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedText = contentText.trim();

    if (!trimmedText && !selectedFile) {
      toast.error('Provide a written response or select a file.');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedFileKey: string | undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse =
          await apiPostFormData<UploadAssignmentFileResponse>(
            `/student/assignments/${assignmentId}/upload`,
            formData,
          );

        uploadedFileKey = uploadResponse.fileKey;
      }

      await apiPost<SubmitAssignmentResponse>(
        `/student/assignments/${assignmentId}/submit`,
        {
          contentText: trimmedText || undefined,
          fileKey: uploadedFileKey,
        },
      );

      toast.success('Assignment submitted successfully.');

      setContentText('');
      clearSelectedFile();

      await loadAssignment();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to submit assignment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

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
          href="/student/assignments"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignments
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

  const canSubmit =
    assignment.availability === 'open' && assignment.submission === null;

  return (
    <div className="space-y-6">
      <Link
        href="/student/assignments"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to assignments
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">
            {assignment.title}
          </h1>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getAvailabilityClasses(
              assignment.availability,
            )}`}
          >
            {assignment.availability}
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-500">{assignment.course.title}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Assignment details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Instructions
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                  {assignment.instructions || 'No instructions provided.'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">
                  Note from teacher
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                  {assignment.noteToStudents || 'No note provided.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {canSubmit && (
            <Card>
              <CardHeader>
                <CardTitle>Submit assignment</CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="contentText">Written response</Label>

                    <textarea
                      id="contentText"
                      rows={8}
                      maxLength={10000}
                      value={contentText}
                      disabled={isSubmitting}
                      onChange={(event) => setContentText(event.target.value)}
                      placeholder="Write your assignment response..."
                      className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-base focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <p className="text-xs text-gray-500">
                      You may provide a written response, upload a file, or do
                      both.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignmentFile">Upload file</Label>

                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                      <div className="flex items-start gap-3">
                        <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />

                        <div className="min-w-0 flex-1">
                          <input
                            id="assignmentFile"
                            type="file"
                            accept=".pdf,.docx,.jpg,.jpeg,.png,.gif,.webp"
                            disabled={isSubmitting}
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-base hover:file:bg-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
                          />

                          <p className="mt-2 text-xs text-gray-500">
                            PDF, DOCX, JPG, JPEG, PNG, GIF or WEBP. Maximum
                            size: 10 MB.
                          </p>

                          {selectedFile && (
                            <div className="mt-3 flex items-center justify-between gap-4 rounded-md border border-gray-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">
                                  {selectedFile.name}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {formatFileSize(selectedFile.size)}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={clearSelectedFile}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading and submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit assignment
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {assignment.submission && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Your submission
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>

                  <p className="mt-1 text-sm capitalize text-gray-600">
                    {assignment.submission.status}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">Submitted</p>

                  <p className="mt-1 text-sm text-gray-600">
                    {formatDate(assignment.submission.submittedAt)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Written response
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {assignment.submission.contentText ||
                      'No written response provided.'}
                  </p>
                </div>

                {assignment.submission.fileUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Submitted file
                    </p>

                    <a
                      href={`${API_URL}${assignment.submission.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary-base hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open submitted file
                    </a>
                  </div>
                )}

                {assignment.submission.grade && (
                  <div className="rounded-lg border border-primary-200 bg-primary-100 p-4">
                    <p className="text-sm font-medium text-primary-base">
                      Grade
                    </p>

                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {assignment.submission.grade.score} /{' '}
                      {assignment.maxScore}
                    </p>

                    <p className="mt-2 text-xs text-gray-600">
                      Graded {formatDate(assignment.submission.grade.gradedAt)}
                    </p>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-900">
                        Teacher feedback
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        {assignment.submission.grade.feedbackText ||
                          assignment.submission.teacherNote ||
                          'No feedback provided.'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

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

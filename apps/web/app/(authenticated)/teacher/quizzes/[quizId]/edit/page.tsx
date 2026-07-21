'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTeacherQuizRequestSchema,
  type TeacherCourseListResponse,
  type TeacherQuizResponse,
} from '@repo/contracts';
import {
  ArrowLeft,
  CirclePlus,
  FileQuestion,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiPatch, fetcher } from '@/lib/api';

type EditQuizFormInput = z.input<typeof createTeacherQuizRequestSchema>;

type EditQuizFormOutput = z.output<typeof createTeacherQuizRequestSchema>;

function createOption() {
  return {
    id: crypto.randomUUID(),
    text: '',
  };
}

function createQuestion(position: number) {
  const firstOption = createOption();
  const secondOption = createOption();

  return {
    questionText: '',
    options: [firstOption, secondOption],
    correctOptionId: firstOption.id,
    points: 1,
    position,
  };
}

function toDateTimeLocal(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffset);

  return localDate.toISOString().slice(0, 16);
}

function localDateTimeToIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export default function EditTeacherQuizPage() {
  const params = useParams<{ quizId: string }>();
  const router = useRouter();

  const quizId = params.quizId;

  const [courses, setCourses] = useState<TeacherCourseListResponse>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditQuizFormInput, unknown, EditQuizFormOutput>({
    resolver: zodResolver(createTeacherQuizRequestSchema),
    defaultValues: {
      courseId: '',
      type: 'quiz',
      title: '',
      instructions: undefined,
      durationMinutes: 20,
      startsAt: undefined,
      dueAt: undefined,
      endsAt: undefined,
      noteToStudents: undefined,
      status: 'draft',
      questions: [createQuestion(0)],
    },
  });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({
    control,
    name: 'questions',
    keyName: 'fieldKey',
  });

  const watchedQuestions = useWatch({
    control,
    name: 'questions',
  });

  const totalPoints = useMemo(() => {
    return (watchedQuestions ?? []).reduce((total, question) => {
      const points = Number(question?.points);

      return total + (Number.isFinite(points) ? points : 0);
    }, 0);
  }, [watchedQuestions]);

  useEffect(() => {
    async function loadPage() {
      setIsLoading(true);
      setLoadFailed(false);

      try {
        const [courseData, quiz] = await Promise.all([
          fetcher<TeacherCourseListResponse>('/teacher/courses'),
          fetcher<TeacherQuizResponse>(`/teacher/quizzes/${quizId}`),
        ]);

        if (quiz.status === 'closed') {
          toast.error(
            'Closed quizzes cannot be edited. Reopen the quiz explicitly first.',
          );

          router.replace(`/teacher/quizzes/${quizId}`);
          return;
        }

        setCourses(courseData);

        reset({
          courseId: quiz.courseId,
          type: quiz.type,
          title: quiz.title,
          instructions: quiz.instructions ?? undefined,
          durationMinutes: quiz.durationMinutes,

          startsAt: quiz.startsAt ?? undefined,
          dueAt: quiz.dueAt ?? undefined,
          endsAt: quiz.endsAt ?? undefined,

          noteToStudents: quiz.noteToStudents ?? undefined,

          status: quiz.status,

          questions: quiz.questions.map((question, position) => ({
            questionText: question.questionText,

            options: question.options.map((option) => ({
              id: option.id,
              text: option.text,
            })),

            correctOptionId: question.correctOptionId,
            points: question.points,
            position,
          })),
        });
      } catch (error) {
        setLoadFailed(true);

        if (error instanceof ApiError) {
          toast.error(error.message);
        } else {
          toast.error('Failed to load quiz. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadPage();
  }, [quizId, reset, router]);

  function addQuestion() {
    appendQuestion(createQuestion(questionFields.length));
  }

  function deleteQuestion(index: number) {
    if (questionFields.length === 1) {
      toast.error('A quiz must contain at least one question.');
      return;
    }

    removeQuestion(index);
  }

  async function onSubmit(data: EditQuizFormOutput) {
    try {
      const normalizedData = {
        ...data,

        instructions: data.instructions || null,
        noteToStudents: data.noteToStudents || null,

        startsAt: data.startsAt ?? null,
        dueAt: data.dueAt ?? null,
        endsAt: data.endsAt ?? null,

        questions: data.questions.map((question, position) => ({
          ...question,
          position,
        })),
      };

      await apiPatch<TeacherQuizResponse>(
        `/teacher/quizzes/${quizId}`,
        normalizedData,
      );

      toast.success('Quiz updated successfully.');

      router.push(`/teacher/quizzes/${quizId}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update quiz. Please try again.');
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-gray-500" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Unable to load quiz
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              The quiz may not exist or you may not have access to it.
            </p>

            <Button asChild className="mt-5">
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
          href={`/teacher/quizzes/${quizId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to quiz
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Edit Quiz</h1>

          <p className="mt-1 text-sm text-gray-500">
            Update the quiz details, questions, and answers.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card className="overflow-hidden border-gray-200 bg-white shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <FileQuestion className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <CardTitle>Quiz details</CardTitle>

                <p className="mt-1 text-sm text-gray-500">
                  Update the quiz information and availability.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="courseId">Course</Label>

                <select
                  id="courseId"
                  disabled={courses.length === 0}
                  aria-invalid={Boolean(errors.courseId)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                  {...register('courseId')}
                >
                  {courses.length === 0 && (
                    <option value="">No courses available</option>
                  )}

                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>

                {errors.courseId?.message && (
                  <p className="text-sm text-red-600">
                    {errors.courseId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Assessment type</Label>

                <select
                  id="type"
                  aria-invalid={Boolean(errors.type)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('type')}
                >
                  <option value="quiz">Quiz</option>
                  <option value="exam">Exam</option>
                </select>

                {errors.type?.message && (
                  <p className="text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>

                <select
                  id="status"
                  aria-invalid={Boolean(errors.status)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('status')}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>

                {errors.status?.message && (
                  <p className="text-sm text-red-600">
                    {errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>

                <Input
                  id="title"
                  placeholder="Example: Algebra Basics Quiz"
                  maxLength={150}
                  aria-invalid={Boolean(errors.title)}
                  {...register('title')}
                />

                {errors.title?.message && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="instructions">Instructions</Label>

                <textarea
                  id="instructions"
                  placeholder="Explain how students should complete the quiz..."
                  rows={5}
                  aria-invalid={Boolean(errors.instructions)}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('instructions', {
                    setValueAs: (value: string) => {
                      const trimmedValue = value.trim();

                      return trimmedValue || undefined;
                    },
                  })}
                />

                {errors.instructions?.message && (
                  <p className="text-sm text-red-600">
                    {errors.instructions.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration in minutes</Label>

                <Input
                  id="durationMinutes"
                  type="number"
                  min="1"
                  max="480"
                  step="1"
                  aria-invalid={Boolean(errors.durationMinutes)}
                  {...register('durationMinutes', {
                    valueAsNumber: true,
                  })}
                />

                {errors.durationMinutes?.message && (
                  <p className="text-sm text-red-600">
                    {errors.durationMinutes.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Total points</Label>

                <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900">
                  {totalPoints}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startsAt">Start date</Label>

                <Controller
                  control={control}
                  name="startsAt"
                  render={({ field }) => (
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={toDateTimeLocal(field.value)}
                      onChange={(event) => {
                        field.onChange(localDateTimeToIso(event.target.value));
                      }}
                      aria-invalid={Boolean(errors.startsAt)}
                    />
                  )}
                />

                {errors.startsAt?.message ? (
                  <p className="text-sm text-red-600">
                    {errors.startsAt.message}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Optional. Students cannot begin before this date.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueAt">Due date</Label>

                <Controller
                  control={control}
                  name="dueAt"
                  render={({ field }) => (
                    <Input
                      id="dueAt"
                      type="datetime-local"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={toDateTimeLocal(field.value)}
                      onChange={(event) => {
                        field.onChange(localDateTimeToIso(event.target.value));
                      }}
                      aria-invalid={Boolean(errors.dueAt)}
                    />
                  )}
                />

                {errors.dueAt?.message ? (
                  <p className="text-sm text-red-600">{errors.dueAt.message}</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Optional. Must be after the start date and no later than the
                    end date.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endsAt">End date</Label>

                <Controller
                  control={control}
                  name="endsAt"
                  render={({ field }) => (
                    <Input
                      id="endsAt"
                      type="datetime-local"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={toDateTimeLocal(field.value)}
                      onChange={(event) => {
                        field.onChange(localDateTimeToIso(event.target.value));
                      }}
                      aria-invalid={Boolean(errors.endsAt)}
                    />
                  )}
                />

                {errors.endsAt?.message ? (
                  <p className="text-sm text-red-600">
                    {errors.endsAt.message}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Optional. Must be later than the start date.
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="noteToStudents">Note to students</Label>

                <textarea
                  id="noteToStudents"
                  placeholder="Optional note visible to students..."
                  rows={3}
                  aria-invalid={Boolean(errors.noteToStudents)}
                  className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  {...register('noteToStudents', {
                    setValueAs: (value: string) => {
                      const trimmedValue = value.trim();

                      return trimmedValue || undefined;
                    },
                  })}
                />

                {errors.noteToStudents?.message && (
                  <p className="text-sm text-red-600">
                    {errors.noteToStudents.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Questions</h2>

              <p className="text-sm text-gray-500">
                Update questions and select the correct answers.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              disabled={questionFields.length >= 100}
            >
              <CirclePlus className="h-4 w-4" />
              Add question
            </Button>
          </div>

          {errors.questions?.root?.message && (
            <p className="text-sm text-red-600">
              {errors.questions.root.message}
            </p>
          )}

          {typeof errors.questions?.message === 'string' && (
            <p className="text-sm text-red-600">{errors.questions.message}</p>
          )}

          {questionFields.map((questionField, questionIndex) => (
            <QuestionCard
              key={questionField.fieldKey}
              questionIndex={questionIndex}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              canRemove={questionFields.length > 1}
              onRemove={() => deleteQuestion(questionIndex)}
            />
          ))}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href={`/teacher/quizzes/${quizId}`}>Cancel</Link>
          </Button>

          <Button type="submit" disabled={isSubmitting || courses.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface QuestionCardProps {
  questionIndex: number;
  control: Control<EditQuizFormInput>;
  register: UseFormRegister<EditQuizFormInput>;
  setValue: UseFormSetValue<EditQuizFormInput>;
  errors: FieldErrors<EditQuizFormInput>;
  canRemove: boolean;
  onRemove: () => void;
}

function QuestionCard({
  questionIndex,
  control,
  register,
  setValue,
  errors,
  canRemove,
  onRemove,
}: QuestionCardProps) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
    keyName: 'fieldKey',
  });

  const options = useWatch({
    control,
    name: `questions.${questionIndex}.options`,
  });

  const correctOptionId = useWatch({
    control,
    name: `questions.${questionIndex}.correctOptionId`,
  });

  const questionErrors = errors.questions?.[questionIndex];

  function addOption() {
    appendOption(createOption());
  }

  function deleteOption(optionIndex: number) {
    if (optionFields.length <= 2) {
      toast.error('Each question must have at least two options.');
      return;
    }

    const removedOption = options?.[optionIndex];

    removeOption(optionIndex);

    if (removedOption?.id === correctOptionId) {
      const remainingOptions =
        options?.filter((_, index) => index !== optionIndex) ?? [];

      setValue(
        `questions.${questionIndex}.correctOptionId`,
        remainingOptions[0]?.id ?? '',
        {
          shouldValidate: true,
          shouldDirty: true,
        },
      );
    }
  }

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader className="border-b bg-gray-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              Question {questionIndex + 1}
            </CardTitle>

            <p className="mt-1 text-sm text-gray-500">
              Select one correct answer.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canRemove}
            onClick={onRemove}
            aria-label={`Remove question ${questionIndex + 1}`}
            className="text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <Label htmlFor={`question-${questionIndex}`}>Question text</Label>

          <textarea
            id={`question-${questionIndex}`}
            rows={3}
            placeholder="Enter the question..."
            aria-invalid={Boolean(questionErrors?.questionText)}
            className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            {...register(`questions.${questionIndex}.questionText`)}
          />

          {questionErrors?.questionText?.message && (
            <p className="text-sm text-red-600">
              {questionErrors.questionText.message}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label>Answer options</Label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              disabled={optionFields.length >= 10}
            >
              <CirclePlus className="h-4 w-4" />
              Add option
            </Button>
          </div>

          <Controller
            control={control}
            name={`questions.${questionIndex}.correctOptionId`}
            render={({ field }) => (
              <div className="space-y-3">
                {optionFields.map((optionField, optionIndex) => {
                  const optionId = options?.[optionIndex]?.id ?? '';

                  return (
                    <div
                      key={optionField.fieldKey}
                      className="flex items-start gap-3"
                    >
                      <input
                        type="hidden"
                        {...register(
                          `questions.${questionIndex}.options.${optionIndex}.id`,
                        )}
                      />

                      <input
                        type="radio"
                        name={field.name}
                        value={optionId}
                        checked={field.value === optionId}
                        onChange={() => field.onChange(optionId)}
                        className="mt-3 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        aria-label={`Mark option ${optionIndex + 1} as correct`}
                      />

                      <div className="flex-1">
                        <Input
                          placeholder={`Option ${optionIndex + 1}`}
                          aria-invalid={Boolean(
                            questionErrors?.options?.[optionIndex]?.text,
                          )}
                          {...register(
                            `questions.${questionIndex}.options.${optionIndex}.text`,
                          )}
                        />

                        {questionErrors?.options?.[optionIndex]?.text
                          ?.message && (
                          <p className="mt-1 text-sm text-red-600">
                            {questionErrors.options[optionIndex]?.text?.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={optionFields.length <= 2}
                        onClick={() => deleteOption(optionIndex)}
                        aria-label={`Remove option ${optionIndex + 1}`}
                        className="mt-0.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          />

          {questionErrors?.options?.root?.message && (
            <p className="text-sm text-red-600">
              {questionErrors.options.root.message}
            </p>
          )}

          {questionErrors?.correctOptionId?.message && (
            <p className="text-sm text-red-600">
              {questionErrors.correctOptionId.message}
            </p>
          )}
        </div>

        <div className="max-w-48 space-y-2">
          <Label htmlFor={`points-${questionIndex}`}>Points</Label>

          <Input
            id={`points-${questionIndex}`}
            type="number"
            min="0.01"
            max="1000"
            step="0.5"
            aria-invalid={Boolean(questionErrors?.points)}
            {...register(`questions.${questionIndex}.points`, {
              valueAsNumber: true,
            })}
          />

          {questionErrors?.points?.message && (
            <p className="text-sm text-red-600">
              {questionErrors.points.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

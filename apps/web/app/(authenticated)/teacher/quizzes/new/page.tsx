'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ApiError, apiPost, fetcher } from '@/lib/api';

type CreateQuizFormInput = z.input<typeof createTeacherQuizRequestSchema>;

type CreateQuizFormOutput = z.output<typeof createTeacherQuizRequestSchema>;

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

export default function NewTeacherQuizPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<TeacherCourseListResponse>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuizFormInput, unknown, CreateQuizFormOutput>({
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
    async function loadCourses() {
      setIsLoadingCourses(true);

      try {
        const data =
          await fetcher<TeacherCourseListResponse>('/teacher/courses');

        setCourses(data);

        if (data[0]) {
          setValue('courseId', data[0].id, {
            shouldValidate: true,
          });
        }
      } catch (error) {
        if (error instanceof ApiError) {
          toast.error(error.message);
        } else {
          toast.error('Failed to load courses. Please try again.');
        }
      } finally {
        setIsLoadingCourses(false);
      }
    }

    void loadCourses();
  }, [setValue]);

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

  async function onSubmit(data: CreateQuizFormOutput) {
    try {
      const normalizedData: CreateQuizFormOutput = {
        ...data,
        questions: data.questions.map((question, position) => ({
          ...question,
          position,
        })),
      };

      const quiz = await apiPost<TeacherQuizResponse>(
        '/teacher/quizzes',
        normalizedData,
      );

      toast.success(
        quiz.type === 'exam'
          ? 'Exam created successfully.'
          : 'Quiz created successfully.',
      );

      router.push('/teacher/quizzes');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create quiz. Please try again.');
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/teacher/quizzes"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to quizzes
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Create Quiz</h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a timed multiple-choice quiz or exam.
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
                  Configure the quiz information and availability.
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
                  disabled={isLoadingCourses || courses.length === 0}
                  aria-invalid={Boolean(errors.courseId)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                  {...register('courseId')}
                >
                  {isLoadingCourses && (
                    <option value="">Loading courses...</option>
                  )}

                  {!isLoadingCourses && courses.length === 0 && (
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

                <Input
                  id="startsAt"
                  type="datetime-local"
                  {...register('startsAt', {
                    setValueAs: (value: string) =>
                      value ? new Date(value).toISOString() : undefined,
                  })}
                />

                {errors.startsAt?.message && (
                  <p className="text-sm text-red-600">
                    {errors.startsAt.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueAt">Due date</Label>

                <Input
                  id="dueAt"
                  type="datetime-local"
                  {...register('dueAt', {
                    setValueAs: (value: string) =>
                      value ? new Date(value).toISOString() : undefined,
                  })}
                />

                {errors.dueAt?.message && (
                  <p className="text-sm text-red-600">{errors.dueAt.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endsAt">End date</Label>

                <Input
                  id="endsAt"
                  type="datetime-local"
                  {...register('endsAt', {
                    setValueAs: (value: string) =>
                      value ? new Date(value).toISOString() : undefined,
                  })}
                />

                {errors.endsAt?.message && (
                  <p className="text-sm text-red-600">
                    {errors.endsAt.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="noteToStudents">Note to students</Label>

                <textarea
                  id="noteToStudents"
                  placeholder="Optional note visible to students..."
                  rows={3}
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
                Add multiple-choice questions and select the correct answer.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={addQuestion}>
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
            <Link href="/teacher/quizzes">Cancel</Link>
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || isLoadingCourses || courses.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Quiz
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
  control: Control<CreateQuizFormInput>;
  register: UseFormRegister<CreateQuizFormInput>;
  setValue: UseFormSetValue<CreateQuizFormInput>;
  errors: FieldErrors<CreateQuizFormInput>;
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

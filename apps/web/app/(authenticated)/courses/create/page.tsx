'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AssignCourseGradeRequestSchema,
  type AssignCourseGradeRequest,
  type AssignCourseGradeResponse,
  type StudentOrganizationGradesResponse,
  type TeacherOrganizationsResponse,
  type TeachersByOrganizationResponse,
} from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiPost, fetcher } from '@/lib/api';

type OrganizationItem = TeacherOrganizationsResponse['organizations'][number];
type TeacherItem = TeachersByOrganizationResponse['teachers'][number];
type GradeItem = StudentOrganizationGradesResponse['grades'][number];

const defaultValues: AssignCourseGradeRequest = {
  organizationId: '',
  teacherId: '',
  gradeId: '',
  title: '',
  description: '',
  status: 'draft',
};

export default function CreateCoursePage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);

  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssignCourseGradeRequest>({
    resolver: zodResolver(AssignCourseGradeRequestSchema),
    defaultValues,
  });

  const organizationId = watch('organizationId');

  useEffect(() => {
    async function loadOrganizations() {
      setIsLoadingOrganizations(true);

      try {
        const data = await fetcher<TeacherOrganizationsResponse>(
          '/teachers/organizations',
        );

        setOrganizations(data.organizations);
      } catch (error) {
        console.error('Failed to load organizations:', error);
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'Failed to load organizations.',
        );
      } finally {
        setIsLoadingOrganizations(false);
      }
    }

    loadOrganizations();
  }, []);

  useEffect(() => {
    if (!organizationId) {
      setTeachers([]);
      setGrades([]);
      setValue('teacherId', '');
      setValue('gradeId', '');
      return;
    }

    async function loadOrganizationDetails() {
      setIsLoadingDetails(true);
      setValue('teacherId', '');
      setValue('gradeId', '');

      try {
        const [teacherData, gradeData] = await Promise.all([
          fetcher<TeachersByOrganizationResponse>(
            `/teachers/organizations/${organizationId}`,
          ),
          fetcher<StudentOrganizationGradesResponse>(
            `/students/organizations/${organizationId}/grades`,
          ),
        ]);

        setTeachers(teacherData.teachers);
        setGrades(gradeData.grades);
      } catch (error) {
        console.error('Failed to load organization details:', error);
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'Failed to load teachers and grades.',
        );
      } finally {
        setIsLoadingDetails(false);
      }
    }

    loadOrganizationDetails();
  }, [organizationId, setValue]);

  async function onSubmit(values: AssignCourseGradeRequest) {
    setIsSubmitting(true);

    const payload: AssignCourseGradeRequest = {
      ...values,
      description: values.description?.trim() || undefined,
      title: values.title.trim(),
    };

    try {
      const result = await apiPost<AssignCourseGradeResponse>(
        '/teachers/course-grade-assignments',
        payload,
      );

      toast.success(
        `${result.createdCourseCount} course section(s) created successfully.`,
      );

      reset(defaultValues);
      setTeachers([]);
      setGrades([]);
    } catch (error) {
      console.error('Failed to create course:', error);
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to create course.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">Create Course</h1>
          <p className="mt-1 text-sm text-gray-500">
            Assign a course to a teacher and grade.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Course Assignment
          </CardTitle>
          <p className="mt-1 text-sm text-gray-500">
            The course will be created for all sections inside the selected
            grade.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Organization
              </label>

              <select
                {...register('organizationId')}
                disabled={isLoadingOrganizations}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {isLoadingOrganizations
                    ? 'Loading organizations...'
                    : 'Select organization'}
                </option>

                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>

              {errors.organizationId?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.organizationId.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Teacher
              </label>

              <select
                {...register('teacherId')}
                disabled={!organizationId || isLoadingDetails}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {isLoadingDetails ? 'Loading teachers...' : 'Select teacher'}
                </option>

                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} — {teacher.email}
                  </option>
                ))}
              </select>

              {errors.teacherId?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.teacherId.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Grade
              </label>

              <select
                {...register('gradeId')}
                disabled={!organizationId || isLoadingDetails}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {isLoadingDetails ? 'Loading grades...' : 'Select grade'}
                </option>

                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>

              {errors.gradeId?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.gradeId.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Course Title
              </label>

              <input
                {...register('title')}
                placeholder="Example: Math"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />

              {errors.title?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                {...register('description')}
                placeholder="Optional course description"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />

              {errors.description?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                {...register('status')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>

              {errors.status?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.status.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creating...' : 'Create Course'}
              </button>

              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

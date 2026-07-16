'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type {
  AssignCourseGradeRequest,
  AssignCourseGradeResponse,
  StudentOrganizationGradesResponse,
  TeacherOrganizationsResponse,
  TeachersByOrganizationResponse,
} from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiPost, fetcher } from '@/lib/api';

type OrganizationItem = TeacherOrganizationsResponse['organizations'][number];
type TeacherItem = TeachersByOrganizationResponse['teachers'][number];
type GradeItem = StudentOrganizationGradesResponse['grades'][number];

export default function CreateCoursePage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);

  const [organizationId, setOrganizationId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setTeacherId('');
      setGradeId('');
      return;
    }

    async function loadOrganizationDetails() {
      setIsLoadingDetails(true);
      setTeacherId('');
      setGradeId('');

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
  }, [organizationId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organizationId || !teacherId || !gradeId || !title.trim()) {
      toast.error('Please fill all required fields.');
      return;
    }

    setIsSubmitting(true);

    const payload: AssignCourseGradeRequest = {
      organizationId,
      teacherId,
      gradeId,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
    };

    try {
      const result = await apiPost<AssignCourseGradeResponse>(
        '/teachers/course-grade-assignments',
        payload,
      );

      toast.success(
        `${result.createdCourseCount} course section(s) created successfully.`,
      );

      setTeacherId('');
      setGradeId('');
      setTitle('');
      setDescription('');
      setStatus('draft');
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Organization
              </label>
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                disabled={isLoadingOrganizations}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                required
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Teacher
              </label>
              <select
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                disabled={!organizationId || isLoadingDetails}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                required
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Grade
              </label>
              <select
                value={gradeId}
                onChange={(event) => setGradeId(event.target.value)}
                disabled={!organizationId || isLoadingDetails}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                required
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
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Course Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Math"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional course description"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'draft' | 'published')
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
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

import { z } from 'zod';

export const DashboardSummarySchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  totalTeachers: z.number().int().nonnegative(),
  totalOrganizations: z.number().int().nonnegative(),
  totalCourses: z.number().int().nonnegative(),
  activeCourses: z.number().int().nonnegative(),
  activeEnrollmentRate: z.number().min(0).max(100),
});

export const DashboardGrowthPointSchema = z.object({
  month: z.string(),
  enrollments: z.number().int().nonnegative(),
});

export const DashboardActivityTypeSchema = z.enum([
  'organization',
  'course',
  'student',
  'teacher',
]);

export const DashboardActivitySchema = z.object({
  id: z.string(),
  type: DashboardActivityTypeSchema,
  title: z.string(),
  description: z.string(),
  occurredAt: z.string(),
  href: z.string(),
});

export const SuperAdminDashboardResponseSchema = z.object({
  summary: DashboardSummarySchema,
  growth: z.array(DashboardGrowthPointSchema),
  recentActivity: z.array(DashboardActivitySchema),
});

export const TeacherDashboardSummarySchema = z.object({
  activeCourses: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  pendingSubmissions: z.number().int().nonnegative(),
  averageQuizScore: z.number().min(0).max(100),
});

export const TeacherDashboardDeadlineSchema = z.object({
  id: z.string(),
  title: z.string(),
  courseTitle: z.string(),
  dueAt: z.string(),
  submittedCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  href: z.string(),
});

export const TeacherDashboardSubmissionSchema = z.object({
  id: z.string(),
  studentName: z.string(),
  assignmentTitle: z.string(),
  courseTitle: z.string(),
  submittedAt: z.string(),
  status: z.enum(['submitted', 'late', 'graded']),
  href: z.string(),
});

export const TeacherDashboardPerformancePointSchema = z.object({
  week: z.string(),
  averageScore: z.number().min(0).max(100),
  targetScore: z.number().min(0).max(100),
});

export const TeacherDashboardGradingProgressSchema = z.object({
  gradedSubmissions: z.number().int().nonnegative(),
  totalSubmissions: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const TeacherDashboardResponseSchema = z.object({
  summary: TeacherDashboardSummarySchema,
  upcomingDeadlines: z.array(TeacherDashboardDeadlineSchema),
  recentSubmissions: z.array(TeacherDashboardSubmissionSchema),
  performance: z.array(TeacherDashboardPerformancePointSchema),
  gradingProgress: TeacherDashboardGradingProgressSchema,
});

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export type DashboardGrowthPoint = z.infer<typeof DashboardGrowthPointSchema>;

export type DashboardActivityType = z.infer<typeof DashboardActivityTypeSchema>;

export type DashboardActivity = z.infer<typeof DashboardActivitySchema>;

export type SuperAdminDashboardResponse = z.infer<
  typeof SuperAdminDashboardResponseSchema
>;

export type TeacherDashboardSummary = z.infer<
  typeof TeacherDashboardSummarySchema
>;

export type TeacherDashboardDeadline = z.infer<
  typeof TeacherDashboardDeadlineSchema
>;

export type TeacherDashboardSubmission = z.infer<
  typeof TeacherDashboardSubmissionSchema
>;

export type TeacherDashboardPerformancePoint = z.infer<
  typeof TeacherDashboardPerformancePointSchema
>;

export type TeacherDashboardGradingProgress = z.infer<
  typeof TeacherDashboardGradingProgressSchema
>;

export type TeacherDashboardResponse = z.infer<
  typeof TeacherDashboardResponseSchema
>;

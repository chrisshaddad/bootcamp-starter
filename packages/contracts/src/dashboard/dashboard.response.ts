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

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export type DashboardGrowthPoint = z.infer<typeof DashboardGrowthPointSchema>;

export type DashboardActivityType = z.infer<typeof DashboardActivityTypeSchema>;

export type DashboardActivity = z.infer<typeof DashboardActivitySchema>;

export type SuperAdminDashboardResponse = z.infer<
  typeof SuperAdminDashboardResponseSchema
>;

import { Injectable } from '@nestjs/common';
import type {
  DashboardActivity,
  DashboardGrowthPoint,
  SuperAdminDashboardResponse,
} from '@repo/contracts';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuperAdminDashboard(): Promise<SuperAdminDashboardResponse> {
    const months = this.getLastSixMonths();
    const growthStartDate = months[0]?.startDate ?? new Date();

    const [
      totalStudents,
      totalTeachers,
      totalOrganizations,
      totalCourses,
      activeCourses,
      totalEnrollments,
      activeEnrollments,
      recentEnrollments,
      recentOrganizations,
      recentCourses,
      recentStudents,
      recentTeachers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: 'MEMBER',
          isConfirmed: true,
        },
      }),

      this.prisma.user.count({
        where: {
          role: 'ORG_ADMIN',
        },
      }),

      this.prisma.organization.count({
        where: {
          status: 'ACTIVE',
        },
      }),

      this.prisma.course.count(),

      this.prisma.course.count({
        where: {
          status: 'published',
        },
      }),

      this.prisma.enrollment.count(),

      this.prisma.enrollment.count({
        where: {
          status: 'active',
        },
      }),

      this.prisma.enrollment.findMany({
        where: {
          enrolledAt: {
            gte: growthStartDate,
          },
        },
        select: {
          enrolledAt: true,
        },
      }),

      this.prisma.organization.findMany({
        take: 3,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      }),

      this.prisma.course.findMany({
        take: 3,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      }),

      this.prisma.user.findMany({
        where: {
          role: 'MEMBER',
          isConfirmed: true,
        },
        take: 3,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
      }),

      this.prisma.user.findMany({
        where: {
          role: 'ORG_ADMIN',
        },
        take: 3,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const activeEnrollmentRate =
      totalEnrollments === 0
        ? 0
        : Math.round((activeEnrollments / totalEnrollments) * 1000) / 10;

    const enrollmentCountByMonth = new Map<string, number>();

    for (const enrollment of recentEnrollments) {
      const monthKey = this.getMonthKey(enrollment.enrolledAt);

      enrollmentCountByMonth.set(
        monthKey,
        (enrollmentCountByMonth.get(monthKey) ?? 0) + 1,
      );
    }

    const growth: DashboardGrowthPoint[] = months.map((month) => ({
      month: month.label,
      enrollments: enrollmentCountByMonth.get(month.key) ?? 0,
    }));

    const activities: DashboardActivity[] = [
      ...recentOrganizations.map(
        (organization): DashboardActivity => ({
          id: `organization-${organization.id}`,
          type: 'organization',
          title: `New organization ${organization.name} created`,
          description: 'A new organization was added to the platform.',
          occurredAt: organization.createdAt.toISOString(),
          href: '/organizations',
        }),
      ),

      ...recentCourses.map(
        (course): DashboardActivity => ({
          id: `course-${course.id}`,
          type: 'course',
          title: `New course ${course.title} created`,
          description: 'A new course was added to the platform.',
          occurredAt: course.createdAt.toISOString(),
          href: '/courses',
        }),
      ),

      ...recentStudents.map(
        (student): DashboardActivity => ({
          id: `student-${student.id}`,
          type: 'student',
          title: `Student ${student.name} joined`,
          description: student.organization?.name
            ? `Joined ${student.organization.name}.`
            : 'Joined the platform.',
          occurredAt: student.createdAt.toISOString(),
          href: '/students',
        }),
      ),

      ...recentTeachers.map(
        (teacher): DashboardActivity => ({
          id: `teacher-${teacher.id}`,
          type: 'teacher',
          title: `Teacher ${teacher.name} joined`,
          description: teacher.organization?.name
            ? `Joined ${teacher.organization.name}.`
            : 'Joined the platform.',
          occurredAt: teacher.createdAt.toISOString(),
          href: '/teachers',
        }),
      ),
    ]
      .sort(
        (firstActivity, secondActivity) =>
          new Date(secondActivity.occurredAt).getTime() -
          new Date(firstActivity.occurredAt).getTime(),
      )
      .slice(0, 4);

    return {
      summary: {
        totalStudents,
        totalTeachers,
        totalOrganizations,
        totalCourses,
        activeCourses,
        activeEnrollmentRate,
      },
      growth,
      recentActivity: activities,
    };
  }

  private getLastSixMonths() {
    const currentDate = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const monthsAgo = 5 - index;

      const date = new Date(
        Date.UTC(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth() - monthsAgo,
          1,
        ),
      );

      return {
        key: this.getMonthKey(date),
        label: new Intl.DateTimeFormat('en-US', {
          month: 'short',
        }).format(date),
        startDate: date,
      };
    });
  }

  private getMonthKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}`;
  }
}

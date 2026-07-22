import { Injectable, Logger } from '@nestjs/common';
import type {
  DashboardActivity,
  DashboardGrowthPoint,
  SuperAdminDashboardResponse,
  TeacherDashboardPerformancePoint,
  TeacherDashboardResponse,
} from '@repo/contracts';

import { PrismaService } from '../database/prisma.service';

const MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const PERFORMANCE_TARGET = 80;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

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

    this.logger.log('Fetched Super Admin dashboard data.');

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

  async getTeacherDashboard(
    teacherId: string,
    organizationId: string | null,
  ): Promise<TeacherDashboardResponse> {
    const now = new Date();
    const weeks = this.getLastSevenWeeks(now);
    const performanceStartDate = weeks[0]?.startDate ?? now;

    const courseOrganizationFilter = organizationId
      ? {
          organizationId,
        }
      : {};

    const [
      activeCourses,
      enrolledStudents,
      pendingSubmissions,
      quizAttempts,
      recentQuizAttempts,
      upcomingAssignments,
      recentSubmissions,
      totalSubmissions,
      gradedSubmissions,
    ] = await Promise.all([
      this.prisma.course.count({
        where: {
          teacherId,
          status: 'published',
          ...courseOrganizationFilter,
        },
      }),

      this.prisma.enrollment.findMany({
        where: {
          status: 'active',
          course: {
            teacherId,
            ...courseOrganizationFilter,
          },
        },
        distinct: ['studentId'],
        select: {
          studentId: true,
        },
      }),

      this.prisma.submission.count({
        where: {
          status: {
            in: ['submitted', 'late'],
          },
          grade: {
            is: null,
          },
          assignment: {
            createdById: teacherId,
            course: courseOrganizationFilter,
          },
        },
      }),

      this.prisma.quizAttempt.findMany({
        where: {
          submittedAt: {
            not: null,
          },
          autoScore: {
            not: null,
          },
          assignment: {
            createdById: teacherId,
            type: {
              in: ['quiz', 'exam'],
            },
            course: courseOrganizationFilter,
          },
        },
        select: {
          autoScore: true,
          assignment: {
            select: {
              maxScore: true,
            },
          },
        },
      }),

      this.prisma.quizAttempt.findMany({
        where: {
          submittedAt: {
            gte: performanceStartDate,
          },
          autoScore: {
            not: null,
          },
          assignment: {
            createdById: teacherId,
            type: {
              in: ['quiz', 'exam'],
            },
            course: courseOrganizationFilter,
          },
        },
        select: {
          autoScore: true,
          submittedAt: true,
          assignment: {
            select: {
              maxScore: true,
            },
          },
        },
      }),

      this.prisma.assignment.findMany({
        where: {
          createdById: teacherId,
          status: 'published',
          dueAt: {
            gte: now,
          },
          course: courseOrganizationFilter,
        },
        take: 4,
        orderBy: {
          dueAt: 'asc',
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          course: {
            select: {
              title: true,
              _count: {
                select: {
                  enrollments: {
                    where: {
                      status: 'active',
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      }),

      this.prisma.submission.findMany({
        where: {
          assignment: {
            createdById: teacherId,
            course: courseOrganizationFilter,
          },
        },
        take: 4,
        orderBy: {
          submittedAt: 'desc',
        },
        select: {
          id: true,
          submittedAt: true,
          status: true,
          student: {
            select: {
              name: true,
            },
          },
          assignment: {
            select: {
              id: true,
              title: true,
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.submission.count({
        where: {
          assignment: {
            createdById: teacherId,
            course: courseOrganizationFilter,
          },
        },
      }),

      this.prisma.submission.count({
        where: {
          grade: {
            isNot: null,
          },
          assignment: {
            createdById: teacherId,
            course: courseOrganizationFilter,
          },
        },
      }),
    ]);

    const averageQuizScore = this.calculateAveragePercentage(
      quizAttempts.map((attempt) => ({
        score: Number(attempt.autoScore),
        maximumScore: Number(attempt.assignment.maxScore),
      })),
    );

    const performanceScores = new Map<
      number,
      Array<{ score: number; maximumScore: number }>
    >();

    for (const attempt of recentQuizAttempts) {
      if (!attempt.submittedAt) {
        continue;
      }

      const weekIndex = Math.floor(
        (attempt.submittedAt.getTime() - performanceStartDate.getTime()) /
          MILLISECONDS_PER_WEEK,
      );

      if (weekIndex < 0 || weekIndex >= weeks.length) {
        continue;
      }

      const weekScores = performanceScores.get(weekIndex) ?? [];

      weekScores.push({
        score: Number(attempt.autoScore),
        maximumScore: Number(attempt.assignment.maxScore),
      });

      performanceScores.set(weekIndex, weekScores);
    }

    const performance: TeacherDashboardPerformancePoint[] = weeks.map(
      (week, index) => ({
        week: week.label,
        averageScore: this.calculateAveragePercentage(
          performanceScores.get(index) ?? [],
        ),
        targetScore: PERFORMANCE_TARGET,
      }),
    );

    const gradingPercentage =
      totalSubmissions === 0
        ? 0
        : Math.round((gradedSubmissions / totalSubmissions) * 1000) / 10;

    this.logger.log(`Fetched dashboard data for teacher ${teacherId}.`);

    return {
      summary: {
        activeCourses,
        totalStudents: enrolledStudents.length,
        pendingSubmissions,
        averageQuizScore,
      },

      upcomingDeadlines: upcomingAssignments.flatMap((assignment) => {
        if (!assignment.dueAt) {
          return [];
        }

        return [
          {
            id: assignment.id,
            title: assignment.title,
            courseTitle: assignment.course.title,
            dueAt: assignment.dueAt.toISOString(),
            submittedCount: assignment._count.submissions,
            totalStudents: assignment.course._count.enrollments,
            href: `/teacher/assignments/${assignment.id}`,
          },
        ];
      }),

      recentSubmissions: recentSubmissions.map((submission) => ({
        id: submission.id,
        studentName: submission.student.name,
        assignmentTitle: submission.assignment.title,
        courseTitle: submission.assignment.course.title,
        submittedAt: submission.submittedAt.toISOString(),
        status: submission.status,
        href: `/teacher/assignments/${submission.assignment.id}`,
      })),

      performance,

      gradingProgress: {
        gradedSubmissions,
        totalSubmissions,
        percentage: gradingPercentage,
      },
    };
  }

  private calculateAveragePercentage(
    scores: Array<{
      score: number;
      maximumScore: number;
    }>,
  ) {
    const percentages = scores
      .filter(
        (score) =>
          Number.isFinite(score.score) &&
          Number.isFinite(score.maximumScore) &&
          score.maximumScore > 0,
      )
      .map((score) => (score.score / score.maximumScore) * 100);

    if (percentages.length === 0) {
      return 0;
    }

    const average =
      percentages.reduce((total, percentage) => total + percentage, 0) /
      percentages.length;

    return Math.round(Math.min(Math.max(average, 0), 100) * 10) / 10;
  }

  private getLastSevenWeeks(currentDate: Date) {
    const currentWeekStart = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
      ),
    );

    const currentDay = currentWeekStart.getUTCDay();
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

    currentWeekStart.setUTCDate(
      currentWeekStart.getUTCDate() - daysSinceMonday,
    );

    return Array.from({ length: 7 }, (_, index) => {
      const weeksAgo = 6 - index;
      const startDate = new Date(
        currentWeekStart.getTime() - weeksAgo * MILLISECONDS_PER_WEEK,
      );

      return {
        label: `W${index + 1}`,
        startDate,
      };
    });
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

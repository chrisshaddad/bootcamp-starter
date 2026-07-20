'use client';

import Link from 'next/link';
import type {
  DashboardActivity,
  DashboardGrowthPoint,
  SuperAdminDashboardResponse,
} from '@repo/contracts';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CloudCheck,
  GraduationCap,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  dashboard: SuperAdminDashboardResponse;
}

interface ManagementCardProps {
  title: string;
  description: string;
  href: string;
  managementLabel: string;
  totalLabel: string;
  totalValue: number;
  organizationCount: number;
  type: 'students' | 'teachers';
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function ManagementCard({
  title,
  description,
  href,
  managementLabel,
  totalLabel,
  totalValue,
  organizationCount,
  type,
}: ManagementCardProps) {
  const isStudents = type === 'students';
  const HeaderIcon = isStudents ? GraduationCap : UserRoundCheck;
  const TotalIcon = isStudents ? UsersRound : UserRoundCheck;

  return (
    <section className="overflow-hidden rounded-lg border border-[#dfe3ed] bg-white">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eeeeff]">
          <HeaderIcon className="h-5 w-5 text-[#0000FF]" />
        </div>

        <div>
          <h2 className="text-[15px] font-bold text-[#17223b]">{title}</h2>

          <p className="mt-1 text-[11px] leading-4 text-[#6d778c]">
            {description}
          </p>
        </div>
      </div>

      <div className="border-t border-[#e7e9f0] bg-[#f8f9fd]">
        <div className="flex items-center justify-between border-b border-[#e7e9f0] px-4 py-3">
          <div className="flex items-center gap-2 text-[#59657c]">
            <TotalIcon className="h-3.5 w-3.5 text-[#0000FF]" />

            <span className="text-[11px] font-medium">{totalLabel}</span>
          </div>

          <span className="text-[12px] font-bold text-[#17223b]">
            {formatNumber(totalValue)}
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-[#59657c]">
            <Building2 className="h-3.5 w-3.5 text-[#0000FF]" />

            <span className="text-[11px] font-medium">Organizations</span>
          </div>

          <span className="text-[12px] font-bold text-[#17223b]">
            {formatNumber(organizationCount)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <Link
          href={href}
          className="group flex items-center justify-between rounded-md border border-[#dfe3ed] bg-white px-3 py-3 transition-colors hover:border-[#bfc4ff] hover:bg-[#f8f8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF]"
        >
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#8b94a7]">
              {managementLabel}
            </p>

            <p className="mt-0.5 text-[12px] font-semibold text-[#17223b]">
              Open
            </p>
          </div>

          <ArrowRight className="h-4 w-4 text-[#17223b] transition-transform group-hover:translate-x-1 group-hover:text-[#0000FF]" />
        </Link>
      </div>
    </section>
  );
}

function GrowthChart({ growth }: { growth: DashboardGrowthPoint[] }) {
  const chartWidth = 600;
  const chartHeight = 150;
  const horizontalPadding = 22;
  const topPadding = 18;
  const bottomPadding = 30;

  const availableWidth = chartWidth - horizontalPadding * 2;
  const availableHeight = chartHeight - topPadding - bottomPadding;

  const maximumValue = Math.max(...growth.map((point) => point.enrollments), 1);

  const points = growth.map((point, index) => {
    const x =
      growth.length <= 1
        ? chartWidth / 2
        : horizontalPadding + (index / (growth.length - 1)) * availableWidth;

    const y =
      topPadding +
      availableHeight -
      (point.enrollments / maximumValue) * availableHeight;

    return {
      ...point,
      x,
      y,
    };
  });

  const polylinePoints = points
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const areaPoints =
    points.length > 0
      ? `${horizontalPadding},${
          chartHeight - bottomPadding
        } ${polylinePoints} ${
          chartWidth - horizontalPadding
        },${chartHeight - bottomPadding}`
      : '';

  return (
    <div className="mt-4 w-full">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Student enrollments over the last six months"
        className="h-[180px] w-full overflow-visible"
      >
        <defs>
          <linearGradient
            id="dashboard-growth-fill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#0000FF" stopOpacity="0.18" />

            <stop offset="100%" stopColor="#0000FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((line) => {
          const y = topPadding + (line / 3) * availableHeight;

          return (
            <line
              key={line}
              x1={horizontalPadding}
              x2={chartWidth - horizontalPadding}
              y1={y}
              y2={y}
              stroke="#edf0f5"
              strokeWidth="1"
            />
          );
        })}

        {areaPoints && (
          <polygon points={areaPoints} fill="url(#dashboard-growth-fill)" />
        )}

        {points.length > 1 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#0000FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point) => (
          <g key={point.month}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#ffffff"
              stroke="#0000FF"
              strokeWidth="2"
            />

            <text
              x={point.x}
              y={chartHeight - 7}
              textAnchor="middle"
              fill="#758096"
              fontSize="9"
            >
              {point.month}
            </text>

            <title>
              {point.month}: {point.enrollments} enrollments
            </title>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ActivityIcon({ activity }: { activity: DashboardActivity }) {
  if (activity.type === 'organization') {
    return <Building2 className="h-3.5 w-3.5" />;
  }

  if (activity.type === 'course') {
    return <BookOpen className="h-3.5 w-3.5" />;
  }

  if (activity.type === 'teacher') {
    return <UserRoundCheck className="h-3.5 w-3.5" />;
  }

  return <GraduationCap className="h-3.5 w-3.5" />;
}

export function SuperAdminDashboard({ dashboard }: SuperAdminDashboardProps) {
  const { summary, growth, recentActivity } = dashboard;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ManagementCard
          title="Students"
          description="View students by organization, grade, and section."
          href="/students"
          managementLabel="Student management"
          totalLabel="Total students"
          totalValue={summary.totalStudents}
          organizationCount={summary.totalOrganizations}
          type="students"
        />

        <ManagementCard
          title="Teachers"
          description="View teachers by organization and manage accounts."
          href="/teachers"
          managementLabel="Teacher management"
          totalLabel="Total teachers"
          totalValue={summary.totalTeachers}
          organizationCount={summary.totalOrganizations}
          type="teachers"
        />
      </div>

      <section className="rounded-lg border border-[#dfe3ed] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eeeeff]">
              <BookOpen className="h-5 w-5 text-[#0000FF]" />
            </div>

            <div>
              <h2 className="text-[15px] font-bold text-[#17223b]">Courses</h2>

              <p className="mt-1 text-[11px] text-[#6d778c]">
                Manage curriculum, cards, and enrollment data.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-[#d9ddff] bg-[#f5f5ff] px-3 py-2 text-[10px] text-[#566078]">
            Total active:{' '}
            <span className="ml-1 font-bold text-[#0000FF]">
              {formatNumber(summary.activeCourses)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/courses"
            className="group flex items-center justify-between rounded-md border border-[#dfe3ed] px-4 py-3 hover:border-[#bfc4ff] hover:bg-[#f8f8ff]"
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#8b94a7]">
                Management
              </p>

              <p className="mt-1 text-[12px] font-semibold text-[#17223b]">
                Course management
              </p>
            </div>

            <BookOpen className="h-4 w-4 text-[#0000FF]" />
          </Link>

          <Link
            href="/courses"
            className="group flex items-center justify-between rounded-md border border-[#dfe3ed] px-4 py-3 hover:border-[#bfc4ff] hover:bg-[#f8f8ff]"
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#8b94a7]">
                Content
              </p>

              <p className="mt-1 text-[12px] font-semibold text-[#17223b]">
                Course cards
              </p>
            </div>

            <ArrowRight className="h-4 w-4 text-[#0000FF] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-[#dfe3ed] bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eeeeff]">
              <TrendingUp className="h-5 w-5 text-[#0000FF]" />
            </div>

            <div>
              <h2 className="text-[15px] font-bold text-[#17223b]">
                Growth Trends
              </h2>

              <p className="mt-1 text-[11px] text-[#6d778c]">
                Student enrollments over the last six months.
              </p>
            </div>
          </div>

          <BarChart3 className="h-4 w-4 text-[#0000FF]" />
        </div>

        <GrowthChart growth={growth} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.7fr]">
        <section className="relative min-h-[180px] overflow-hidden rounded-lg bg-[#0000FF] p-5 text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative z-10">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/80">
              Enrollment health
            </p>

            <p className="mt-2 text-xl font-bold">
              {summary.activeEnrollmentRate}% Active
            </p>
          </div>

          <div className="absolute bottom-5 left-5 z-10">
            <CloudCheck className="h-8 w-8 text-white/80" />
          </div>

          <p className="absolute bottom-5 right-5 z-10 text-[9px] font-semibold text-white/80">
            {formatNumber(summary.totalCourses)} total courses
          </p>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#dfe3ed] bg-[#eef2ff]">
          <div className="flex items-center justify-between border-b border-[#dfe3ed] px-4 py-3">
            <div>
              <h2 className="text-[14px] font-bold text-[#17223b]">
                Recent Activity
              </h2>

              <p className="mt-0.5 text-[10px] text-[#68748a]">
                Latest actions across all organizations
              </p>
            </div>

            <span className="text-[10px] font-semibold text-[#0000FF]">
              Latest records
            </span>
          </div>

          <div className="space-y-2 p-3">
            {recentActivity.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center rounded-md border border-[#dfe3ed] bg-white text-[11px] text-[#7d879a]">
                No recent activity
              </div>
            ) : (
              recentActivity.map((activity) => (
                <Link
                  href={activity.href}
                  key={activity.id}
                  className="flex items-center gap-3 rounded-md border border-[#dfe3ed] bg-white px-3 py-3 transition-colors hover:border-[#bfc4ff]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eeeeff] text-[#0000FF]">
                    <ActivityIcon activity={activity} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[#17223b]">
                      {activity.title}
                    </p>

                    <p className="mt-0.5 truncate text-[9px] text-[#7b8598]">
                      {activity.description}
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-1 text-[9px] text-[#7b8598] sm:flex">
                    <CalendarDays className="h-3 w-3" />
                    {formatActivityDate(activity.occurredAt)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

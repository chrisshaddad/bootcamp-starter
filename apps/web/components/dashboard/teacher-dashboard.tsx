'use client';

import Link from 'next/link';
import type { TeacherDashboardResponse } from '@repo/contracts';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';

interface TeacherDashboardProps {
  dashboard: TeacherDashboardResponse;
  teacherName: string;
}

function formatDeadline(dateValue: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function formatSubmissionDate(dateValue: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) ?? ''}${
      parts[1]?.charAt(0) ?? ''
    }`.toUpperCase();
  }

  return name.charAt(0).toUpperCase() || 'S';
}

export function TeacherDashboard({
  dashboard,
  teacherName,
}: TeacherDashboardProps) {
  const {
    summary,
    upcomingDeadlines,
    recentSubmissions,
    performance,
    gradingProgress,
  } = dashboard;

  const summaryCards = [
    {
      title: 'Active Courses',
      value: summary.activeCourses.toLocaleString(),
      description: 'Currently published',
      icon: BookOpen,
      iconColor: 'text-[#0000FF]',
      iconBackground: 'bg-[#eeeeff]',
    },
    {
      title: 'Total Students',
      value: summary.totalStudents.toLocaleString(),
      description: 'Across all courses',
      icon: Users,
      iconColor: 'text-[#0000FF]',
      iconBackground: 'bg-[#eeeeff]',
    },
    {
      title: 'Pending Submissions',
      value: summary.pendingSubmissions.toLocaleString(),
      description: 'Requires attention',
      icon: ClipboardCheck,
      iconColor: 'text-[#e03137]',
      iconBackground: 'bg-[#ffedec]',
    },
    {
      title: 'Avg. Quiz Score',
      value: `${summary.averageQuizScore.toFixed(1)}%`,
      description: 'Student performance',
      icon: TrendingUp,
      iconColor: 'text-[#0000FF]',
      iconBackground: 'bg-[#eeeeff]',
    },
  ];

  const progressRadius = 42;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset =
    progressCircumference *
    (1 - Math.min(Math.max(gradingProgress.percentage, 0), 100) / 100);

  return (
    <div className="relative space-y-5 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#17223b] sm:text-2xl">
            Welcome back, {teacherName}!
          </h1>

          <p className="mt-1 text-[11px] text-[#6d778c] sm:text-xs">
            Here&apos;s what&apos;s happening across your courses today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/teacher/assignments/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0000FF] px-4 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0000cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Create Assignment
          </Link>

          <Link
            href="/teacher/quizzes/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0000FF] px-4 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0000cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
          >
            <FileQuestion className="h-3.5 w-3.5" />
            Add New Quiz
          </Link>
        </div>
      </header>

      <section
        aria-label="Teacher dashboard summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-lg border border-[#dfe3ee] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#7d879b]">
                    {card.title}
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#17223b]">
                    {card.value}
                  </p>

                  <p className="mt-1 text-[10px] text-[#8a94a8]">
                    {card.description}
                  </p>
                </div>

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${card.iconBackground}`}
                >
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="overflow-hidden rounded-lg border border-[#dfe3ee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-[#e7eaf1] px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-[#17223b]">
                Upcoming Deadlines
              </h2>

              <p className="mt-1 text-[10px] text-[#8a94a8]">
                Published assignments that are due soon.
              </p>
            </div>

            <Link
              href="/teacher/assignments"
              className="text-[10px] font-semibold text-[#0000FF] hover:underline"
            >
              View Calendar
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeeff]">
                <CalendarDays className="h-5 w-5 text-[#0000FF]" />
              </div>

              <p className="mt-3 text-xs font-semibold text-[#17223b]">
                No upcoming deadlines
              </p>

              <p className="mt-1 text-[10px] text-[#8a94a8]">
                New published deadlines will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf0f5]">
              {upcomingDeadlines.map((deadline) => {
                const progress =
                  deadline.totalStudents === 0
                    ? 0
                    : Math.round(
                        (deadline.submittedCount / deadline.totalStudents) *
                          100,
                      );

                return (
                  <Link
                    key={deadline.id}
                    href={deadline.href}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#fafbff] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_150px] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-[#17223b]">
                        {deadline.title}
                      </p>

                      <p className="mt-1 truncate text-[9px] text-[#8a94a8]">
                        {deadline.courseTitle}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-medium text-[#17223b]">
                        {formatDeadline(deadline.dueAt)}
                      </p>

                      <p className="mt-1 text-[9px] text-[#8a94a8]">Due date</p>
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-[#e8ebf3] sm:max-w-20">
                        <div
                          className="h-full rounded-full bg-[#0000FF]"
                          style={{
                            width: `${Math.min(Math.max(progress, 0), 100)}%`,
                          }}
                        />
                      </div>

                      <span className="min-w-10 rounded-full bg-[#eeeeff] px-2 py-1 text-center text-[9px] font-semibold text-[#0000FF]">
                        {deadline.submittedCount}/{deadline.totalStudents}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col overflow-hidden rounded-lg border border-[#dfe3ee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="border-b border-[#e7eaf1] px-5 py-4">
            <h2 className="text-sm font-bold text-[#17223b]">
              Recent Submissions
            </h2>

            <p className="mt-1 text-[10px] text-[#8a94a8]">
              Latest work submitted by students.
            </p>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeeff]">
                <ClipboardCheck className="h-5 w-5 text-[#0000FF]" />
              </div>

              <p className="mt-3 text-xs font-semibold text-[#17223b]">
                No submissions yet
              </p>

              <p className="mt-1 text-[10px] text-[#8a94a8]">
                Student submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="flex-1 divide-y divide-[#edf0f5]">
              {recentSubmissions.map((submission, index) => {
                const avatarColors = [
                  'bg-[#eeeeff] text-[#0000FF]',
                  'bg-[#eaf8f1] text-[#0caf60]',
                  'bg-[#fff3e9] text-[#e56a14]',
                  'bg-[#f3eeff] text-[#8c62ff]',
                ];

                return (
                  <Link
                    key={submission.id}
                    href={submission.href}
                    className="flex gap-3 px-5 py-3 transition-colors hover:bg-[#fafbff]"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${
                        avatarColors[index % avatarColors.length]
                      }`}
                    >
                      {getInitials(submission.studentName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-semibold text-[#17223b]">
                        {submission.studentName}
                      </p>

                      <p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-[#657087]">
                        Submitted{' '}
                        <span className="font-medium text-[#0000FF]">
                          {submission.assignmentTitle}
                        </span>
                      </p>

                      <p className="mt-1 truncate text-[8px] text-[#9aa2b2]">
                        {submission.courseTitle} ·{' '}
                        {formatSubmissionDate(submission.submittedAt)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="border-t border-[#e7eaf1] p-3">
            <Link
              href="/teacher/assignments"
              className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-[#0000FF] text-[10px] font-semibold text-[#0000FF] transition-colors hover:bg-[#eeeeff]"
            >
              View All Submissions
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="rounded-lg border border-[#dfe3ee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#17223b]">
                Class Performance Overview
              </h2>

              <p className="mt-1 text-[10px] text-[#8a94a8]">
                Average quiz results across the last seven weeks.
              </p>
            </div>

            <div className="flex items-center gap-4 text-[9px] text-[#6d778c]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0000FF]" />
                Average
              </span>

              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#dfe5f1]" />
                Target
              </span>
            </div>
          </div>

          <div className="mt-7 flex h-52 items-end justify-between gap-2 border-b border-[#e5e8ef] px-1 sm:gap-4 sm:px-4">
            {performance.map((point) => (
              <div
                key={point.week}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                <div className="flex h-[170px] w-full items-end justify-center gap-1 sm:gap-2">
                  <div
                    title={`Average: ${point.averageScore.toFixed(1)}%`}
                    className="w-full max-w-7 rounded-t-sm bg-[#0000FF] transition-[height] duration-300"
                    style={{
                      height: `${Math.max(point.averageScore, 2)}%`,
                    }}
                  />

                  <div
                    title={`Target: ${point.targetScore.toFixed(1)}%`}
                    className="w-full max-w-7 rounded-t-sm bg-[#dfe5f1]"
                    style={{
                      height: `${Math.max(point.targetScore, 2)}%`,
                    }}
                  />
                </div>

                <span className="mt-2 text-[9px] font-medium text-[#7d879b]">
                  {point.week}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-center justify-center rounded-lg border border-[#dfe3ee] bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="relative h-32 w-32">
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`${gradingProgress.percentage.toFixed(
                1,
              )}% grading progress`}
            >
              <circle
                cx="50"
                cy="50"
                r={progressRadius}
                fill="none"
                stroke="#e8ebf3"
                strokeWidth="7"
              />

              <circle
                cx="50"
                cy="50"
                r={progressRadius}
                fill="none"
                stroke="#0000FF"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressOffset}
              />
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-[#17223b]">
                {Math.round(gradingProgress.percentage)}%
              </span>
            </div>
          </div>

          <h2 className="mt-4 text-sm font-bold text-[#17223b]">
            Grading Progress
          </h2>

          <p className="mt-2 text-[10px] leading-4 text-[#8a94a8]">
            You&apos;ve graded {gradingProgress.gradedSubmissions} out of{' '}
            {gradingProgress.totalSubmissions} submitted assignments.
          </p>

          <Link
            href="/teacher/assignments"
            className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold text-[#0000FF] hover:underline"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete Grading
          </Link>
        </section>
      </div>

      <Link
        href="/teacher/assignments/new"
        aria-label="Create a new assignment"
        title="Create a new assignment"
        className="fixed bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0000FF] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#0000cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF] focus-visible:ring-offset-2"
      >
        <Plus className="h-5 w-5" />
      </Link>
    </div>
  );
}

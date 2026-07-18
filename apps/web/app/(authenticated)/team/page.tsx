'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Briefcase, FileText, ShieldX, Users } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useEmployee } from '@/hooks/use-employee';
import { useEmployees } from '@/hooks/use-employees';
import { useOpportunities } from '@/hooks/use-opportunities';
import { useApplications } from '@/hooks/use-applications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@repo/contracts';

const STATUS_BADGE_COLORS: Record<ApplicationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
};

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.charAt(0)?.toUpperCase() ?? '?';
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-red-400" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        Only managers can view their team&apos;s overview.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  loading: boolean;
}

function StatCard({ title, value, icon, loading }: StatCardProps) {
  return (
    <Card className="flex flex-row items-center justify-between gap-4 border-gray-200 p-5 shadow-sm">
      <div>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">{title}</p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-base/10 text-primary-base">
        {icon}
      </div>
    </Card>
  );
}

interface SkillBreakdownRow {
  id: string;
  name: string;
  memberCount: number;
  averageLevel: number;
}

function SkillBreakdownBar({ row }: { row: SkillBreakdownRow }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900">{row.name}</span>
        <span className="flex items-center gap-2 text-gray-500">
          {row.memberCount} team member{row.memberCount === 1 ? '' : 's'}
          <span className="font-medium text-primary-base">
            L{row.averageLevel}
          </span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-primary-base"
          style={{ width: `${(row.averageLevel / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}

// Public ApplicationStatus collapses MANAGER_REVIEW/UNDER_REVIEW/SHORTLISTED
// down to PENDING (see ApplicationsService.toPublicStatus) - so "pending
// review" for a manager is simply the public PENDING status.
const PENDING_STATUSES: ApplicationStatus[] = ['PENDING'];

export default function TeamOverviewPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const isManager = Boolean(user?.isManager);

  const { employee } = useEmployee(user?.id, { enabled: isManager });
  const { employees, isLoading: employeesLoading } = useEmployees({
    mine: true,
    enabled: isManager,
  });
  const { opportunities, isLoading: opportunitiesLoading } = useOpportunities({
    mine: true,
    status: 'OPEN',
    enabled: isManager,
  });
  const { applications, isLoading: applicationsLoading } = useApplications({
    team: true,
    enabled: isManager,
  });

  const skillBreakdown = useMemo<SkillBreakdownRow[]>(() => {
    if (!employees) return [];

    const bySkill = new Map<
      string,
      { name: string; total: number; count: number }
    >();

    for (const member of employees) {
      for (const skill of member.skills) {
        const existing = bySkill.get(skill.id);
        if (existing) {
          existing.total += skill.proficiencyLevel;
          existing.count += 1;
        } else {
          bySkill.set(skill.id, {
            name: skill.name,
            total: skill.proficiencyLevel,
            count: 1,
          });
        }
      }
    }

    return Array.from(bySkill.entries())
      .map(([id, { name, total, count }]) => ({
        id,
        name,
        memberCount: count,
        averageLevel: Math.round(total / count),
      }))
      .sort(
        (a, b) =>
          b.memberCount - a.memberCount || a.name.localeCompare(b.name),
      );
  }, [employees]);

  const pendingReviewsCount = (applications ?? []).filter((application) =>
    PENDING_STATUSES.includes(application.status),
  ).length;

  const recentApplications = (applications ?? []).slice(0, 5);

  if (isUserLoading) {
    return <LoadingSkeleton />;
  }

  if (!isManager) {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          {user?.name}
          {employee?.department ? ` · ${employee.department.name}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Team Members"
          value={employees?.length}
          icon={<Users className="h-5 w-5" />}
          loading={employeesLoading}
        />
        <StatCard
          title="Open Opportunities"
          value={opportunities?.length}
          icon={<Briefcase className="h-5 w-5" />}
          loading={opportunitiesLoading}
        />
        <StatCard
          title="Pending Reviews"
          value={pendingReviewsCount}
          icon={<FileText className="h-5 w-5" />}
          loading={applicationsLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="gap-4 border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            Team Skills Breakdown
          </h2>
          {employeesLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : skillBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No skills recorded for your team yet
            </p>
          ) : (
            <div className="space-y-4">
              {skillBreakdown.map((row) => (
                <SkillBreakdownBar key={row.id} row={row} />
              ))}
            </div>
          )}
        </Card>

        <Card className="gap-4 border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Recent Applications
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/applications?team=true')}
              className="text-sm text-primary-base hover:text-primary-base/80"
            >
              Manage
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {applicationsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : recentApplications.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No applications from your team yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((application) => (
                <Link
                  key={application.id}
                  href={`/applications/${application.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {application.user.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {application.opportunity.title}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      STATUS_BADGE_COLORS[application.status],
                    )}
                  >
                    {toLabel(application.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="gap-4 border-gray-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Team Members
        </h2>
        {employeesLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !employees?.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
            <Users className="h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              You don&apos;t have any direct reports yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {employees.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary-base text-sm font-medium text-white">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {member.title ?? 'No title set'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

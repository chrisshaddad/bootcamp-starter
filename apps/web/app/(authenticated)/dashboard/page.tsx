'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useOpportunities } from '@/hooks/use-opportunities';
import { useApplications } from '@/hooks/use-applications';
import { useCareerPaths } from '@/hooks/use-career-paths';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBreakdownBar } from '@/components/charts/status-breakdown-bar';
import {
  ApplicationsTrendChart,
  type TrendPoint,
} from '@/components/charts/applications-trend-chart';
import { OpportunityTypeBars } from '@/components/charts/opportunity-type-bars';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUS_TONE, toLabel } from '@/lib/labels';
import type {
  ApplicationResponse,
  ApplicationStatus,
  OpportunityResponse,
  OpportunityType,
} from '@repo/contracts';

const APPLICATION_STATUS_LIST: ApplicationStatus[] = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
];

const OPPORTUNITY_TYPE_LIST: OpportunityType[] = [
  'ROLE',
  'PROJECT',
  'ROTATION',
];

const TREND_WEEKS = 8;

function buildStatusCounts(
  applications: ApplicationResponse[] | undefined,
): Record<ApplicationStatus, number> {
  const counts = Object.fromEntries(
    APPLICATION_STATUS_LIST.map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;
  for (const application of applications ?? []) {
    counts[application.status] += 1;
  }
  return counts;
}

function buildOpportunityTypeCounts(
  opportunities: OpportunityResponse[] | undefined,
): Record<OpportunityType, number> {
  const counts = Object.fromEntries(
    OPPORTUNITY_TYPE_LIST.map((type) => [type, 0]),
  ) as Record<OpportunityType, number>;
  for (const opportunity of opportunities ?? []) {
    counts[opportunity.type] += 1;
  }
  return counts;
}

// Buckets applications into calendar weeks (Sun-Sat), oldest first, so the
// trend chart reads left-to-right as "then -> now".
function buildWeeklyTrend(
  applications: ApplicationResponse[] | undefined,
  weeks: number,
): TrendPoint[] {
  const startOfThisWeek = new Date();
  startOfThisWeek.setHours(0, 0, 0, 0);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());

  const points: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(startOfThisWeek);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const value = (applications ?? []).filter((application) => {
      const createdAt = new Date(application.createdAt);
      return createdAt >= weekStart && createdAt < weekEnd;
    }).length;

    points.push({
      label: weekStart.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      value,
    });
  }
  return points;
}

type StatTone = 'primary' | 'info' | 'success' | 'warning';

const STAT_TONE_CLASSES: Record<StatTone, string> = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/12 text-info',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/18 text-warning',
};

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  href: string;
  loading: boolean;
  tone: StatTone;
}

function StatCard({ title, value, icon, href, loading, tone }: StatCardProps) {
  return (
    <Link
      href={href}
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full flex-row items-center gap-4 p-5 transition-shadow hover:shadow-md">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            STAT_TONE_CLASSES[tone],
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <p className="text-2xl font-bold tabular-nums leading-none text-foreground">
              {value ?? 0}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">{title}</p>
        </div>
      </Card>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const { opportunities, isLoading: oppsLoading } = useOpportunities({
    status: 'OPEN',
  });
  const { applications, isLoading: appsLoading } = useApplications();
  const { careerPaths, isLoading: pathsLoading } = useCareerPaths();

  const statusCounts = useMemo(
    () => buildStatusCounts(applications),
    [applications],
  );
  const opportunityTypeCounts = useMemo(
    () => buildOpportunityTypeCounts(opportunities),
    [opportunities],
  );
  const weeklyTrend = useMemo(
    () => buildWeeklyTrend(applications, TREND_WEEKS),
    [applications],
  );

  if (userLoading) {
    return <DashboardSkeleton />;
  }

  const recentApplications = (applications ?? []).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name || user?.email?.split('@')[0] || 'there'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your career activity
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Open Opportunities"
          value={opportunities?.length}
          icon={<Briefcase className="h-5 w-5" />}
          href="/opportunities"
          loading={oppsLoading}
          tone="primary"
        />
        <StatCard
          title="My Applications"
          value={applications?.length}
          icon={<FileText className="h-5 w-5" />}
          href="/applications"
          loading={appsLoading}
          tone="info"
        />
        <StatCard
          title="Career Paths"
          value={careerPaths?.length}
          icon={<TrendingUp className="h-5 w-5" />}
          href="/career-paths"
          loading={pathsLoading}
          tone="success"
        />
        <StatCard
          title="Pending Applications"
          value={applications?.filter((a) => a.status === 'PENDING').length}
          icon={<Layers className="h-5 w-5" />}
          href="/applications"
          loading={appsLoading}
          tone="warning"
        />
      </div>

      {/* Activity charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-4 p-5 lg:col-span-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Applications Over Time
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last {TREND_WEEKS} weeks
            </p>
          </div>
          {appsLoading ? (
            <Skeleton className="h-[220px] w-full rounded-lg" />
          ) : (
            <ApplicationsTrendChart data={weeklyTrend} />
          )}
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-base font-semibold text-foreground">
            Applications by Status
          </h2>
          {appsLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <StatusBreakdownBar counts={statusCounts} />
          )}
        </Card>
      </div>

      {/* Recent Applications + open opportunities by type */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="gap-4 p-5">
          <h2 className="text-base font-semibold text-foreground">
            Open Opportunities
          </h2>
          {oppsLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <OpportunityTypeBars counts={opportunityTypeCounts} />
          )}
        </Card>

        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Recent Applications
            </h2>
            {(applications?.length ?? 0) > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/applications')}
                className="text-muted-foreground hover:text-foreground"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>

          {appsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
              ))}
            </div>
          ) : recentApplications.length === 0 ? (
            <Card className="items-center justify-center gap-0 border-dashed py-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">
                No applications yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Apply to an opportunity to start tracking it here.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/opportunities')}
              >
                Browse Opportunities
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <Link key={app.id} href={`/applications/${app.id}`}>
                  <Card className="flex-row items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {app.opportunity.title}
                        </p>
                        <Badge tone="violet">
                          {toLabel(app.opportunity.type)}
                        </Badge>
                        <Badge tone={APPLICATION_STATUS_TONE[app.status]}>
                          {toLabel(app.status)}
                        </Badge>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

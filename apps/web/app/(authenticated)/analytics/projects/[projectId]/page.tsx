'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Eye,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAnalyticsRange, useProjectAnalytics } from '@/hooks/use-analytics';
import {
  AnalyticsDailyChart,
  AnalyticsMetricCard,
  AnalyticsRangeSelect,
  AnalyticsReferrers,
} from '@/components/analytics-widgets';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectAnalyticsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
      <ProjectAnalyticsContent />
    </Suspense>
  );
}

function ProjectAnalyticsContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const { range, setRange } = useAnalyticsRange();
  const { analytics, error, isLoading } = useProjectAnalytics(projectId, range);

  if (isLoading) return <Skeleton className="h-[520px] rounded-xl" />;
  if (error || !analytics) {
    return (
      <Card className="border-dashed p-10 text-center">
        <p className="font-medium">Unable to load project analytics</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof ApiError
            ? error.message
            : 'Please try again shortly.'}
        </p>
      </Card>
    );
  }

  const audienceTotal = Object.values(analytics.audience).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/analytics?range=${range}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Portfolio analytics
      </Link>
      <div className="flex flex-col gap-5 rounded-2xl border bg-gradient-to-br from-primary-100/70 to-background p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-primary-base uppercase">
            Project insights
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {analytics.project.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Traffic for this published project
          </p>
        </div>
        <AnalyticsRangeSelect value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AnalyticsMetricCard
          icon={Eye}
          label="Total views"
          value={analytics.totals.totalViews}
          detail="All eligible project visits"
        />
        <AnalyticsMetricCard
          icon={Users}
          label="Unique visitors"
          value={analytics.totals.uniqueVisitors}
          detail="Privacy-safe visitor count"
        />
        <AnalyticsMetricCard
          icon={BriefcaseBusiness}
          label="Recruiter visitors"
          value={analytics.totals.recruiterViews}
          detail="Unique signed-in recruiter visitors"
        />
      </div>

      <AnalyticsDailyChart data={analytics.daily} />

      <div
        className={`grid gap-6 ${
          analytics.referrers.length > 0 ? 'lg:grid-cols-2' : ''
        }`}
      >
        {analytics.referrers.length > 0 && (
          <AnalyticsReferrers referrers={analytics.referrers} />
        )}
        <Card className="p-5 shadow-sm">
          <h2 className="text-base font-semibold">Audience</h2>
          <p className="text-xs text-muted-foreground">
            Account category at the time of the visit
          </p>
          <div className="mt-5 space-y-4">
            <AudienceRow
              icon={BriefcaseBusiness}
              label="Recruiters"
              value={analytics.audience.recruiters}
              total={audienceTotal}
            />
            <AudienceRow
              icon={UserRound}
              label="Developers"
              value={analytics.audience.developers}
              total={audienceTotal}
            />
            <AudienceRow
              icon={Users}
              label="Other visitors"
              value={analytics.audience.anonymous + analytics.audience.other}
              total={audienceTotal}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function AudienceRow({
  icon: Icon,
  label,
  value,
  total,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span className="font-semibold tabular-nums">
            {value} · {percentage}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-chart-3"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

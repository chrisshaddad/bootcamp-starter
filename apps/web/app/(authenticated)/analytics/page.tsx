'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, Eye, FolderGit2, Users } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAnalyticsOverview, useAnalyticsRange } from '@/hooks/use-analytics';
import {
  AnalyticsDailyChart,
  AnalyticsMetricCard,
  AnalyticsRangeSelect,
  AnalyticsReferrers,
} from '@/components/analytics-widgets';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsOverviewPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsOverviewContent />
    </Suspense>
  );
}

function AnalyticsOverviewContent() {
  const { range, setRange } = useAnalyticsRange();
  const { analytics, error, isLoading } = useAnalyticsOverview(range);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand how recruiters discover your profile and published work.
          </p>
        </div>
        <AnalyticsRangeSelect value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : error || !analytics ? (
        <Card className="border-dashed p-10 text-center">
          <p className="font-medium">Unable to load analytics</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof ApiError
              ? error.message
              : 'Please try again shortly.'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetricCard
              icon={Eye}
              label="Total views"
              value={analytics.totals.totalViews}
              detail={comparisonLabel(
                analytics.comparison.totalViewsPercent,
                'previous period',
              )}
            />
            <AnalyticsMetricCard
              icon={Users}
              label="Unique visitors"
              value={analytics.totals.uniqueVisitors}
              detail={comparisonLabel(
                analytics.comparison.uniqueVisitorsPercent,
                'previous period',
              )}
            />
            <AnalyticsMetricCard
              icon={BriefcaseBusiness}
              label="Recruiter views"
              value={analytics.totals.recruiterViews}
              detail="Signed-in recruiter traffic"
            />
            <AnalyticsMetricCard
              icon={FolderGit2}
              label="Project views"
              value={analytics.totals.projectViews}
              detail={`Profile views: ${analytics.totals.portfolioViews}`}
            />
          </div>

          <AnalyticsDailyChart data={analytics.daily} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <Card className="p-5 shadow-sm">
              <h2 className="font-semibold">Project performance</h2>
              <p className="text-xs text-muted-foreground">
                Includes projects you own and verified collaborations
              </p>
              <div className="mt-4 divide-y">
                {analytics.projects.length === 0 ? (
                  <p className="py-5 text-sm text-muted-foreground">
                    No accessible projects yet.
                  </p>
                ) : (
                  analytics.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/analytics/projects/${project.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-primary-base"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {project.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.uniqueVisitors} unique ·{' '}
                          {project.recruiterViews} recruiter
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {project.totalViews}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </Card>
            <AnalyticsReferrers referrers={analytics.referrers} />
          </div>
        </>
      )}
    </div>
  );
}

function comparisonLabel(value: number | null, suffix: string) {
  if (value === null) return `New activity vs ${suffix}`;
  if (value === 0) return `No change vs ${suffix}`;
  return `${value > 0 ? '+' : ''}${value}% vs ${suffix}`;
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

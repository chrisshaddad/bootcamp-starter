'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  BriefcaseBusiness,
  ChevronRight,
  Eye,
  FolderGit2,
  Users,
} from 'lucide-react';
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
      <div className="flex flex-col gap-5 rounded-2xl border bg-gradient-to-br from-primary-100/70 to-background p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-primary-base uppercase">
            Insights
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Portfolio analytics
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
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
            <Card className="gap-5 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-base">
                  <FolderGit2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">
                    Project performance
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Owned projects and verified collaborations
                  </p>
                </div>
              </div>
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
                      className="group -mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
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
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {project.totalViews.toLocaleString()}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
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

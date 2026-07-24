'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Calendar, FileText, Search } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useApplicationsInfinite } from '@/hooks/use-applications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUS_TONE, toLabel } from '@/lib/labels';
import type { ApplicationStatus } from '@repo/contracts';

type StatusFilter = 'ALL' | ApplicationStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Withdrawn', value: 'WITHDRAWN' },
];

// Urgency-based sort: pending/actionable first, then resolved statuses
const STATUS_SORT_ORDER: Record<ApplicationStatus, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
  WITHDRAWN: 3,
};

/** Color roles for the skill-fit meter — mirrors the opportunity detail page. */
function fitTone(score: number) {
  if (score >= 70) return { text: 'text-success', bar: 'bg-success' };
  if (score >= 40) return { text: 'text-warning', bar: 'bg-warning' };
  return { text: 'text-destructive', bar: 'bg-destructive' };
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      aria-pressed={active}
      onClick={onClick}
      className={cn('h-9 rounded-lg px-3.5 text-sm font-medium')}
    >
      {children}
    </Button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-44 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const teamView =
    searchParams.get('team') === 'true' && Boolean(user?.isManager);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const { applications, isLoading, hasMore, isLoadingMore, loadMore, error } =
    useApplicationsInfinite({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      team: teamView,
    });

  const filtered = useMemo(() => {
    let result = applications ?? [];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((app) =>
        app.opportunity.title.toLowerCase().includes(term),
      );
    }
    return [...result].sort(
      (a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status],
    );
  }, [applications, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {teamView ? 'Team Applications' : 'My Applications'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {teamView
            ? 'Review the opportunities your direct reports have applied to'
            : "Track the status of the opportunities you've applied to"}
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search applications"
            className="h-10 rounded-lg pl-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <FilterButton
              key={filter.value}
              active={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Failed to load applications
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please refresh the page or try again later.
          </p>
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {statusFilter !== 'ALL'
              ? 'No applications match your filters'
              : teamView
                ? "Your team hasn't applied to any opportunities yet"
                : "You haven't applied to any opportunities yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((application) => {
              const hasFit = application.fitScore != null;
              const score = hasFit ? Math.round(application.fitScore!) : 0;
              const tone = fitTone(score);

              return (
                <Link
                  key={application.id}
                  href={`/applications/${application.id}`}
                  className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="h-full gap-0 p-5 transition-shadow group-hover:shadow-md">
                    {/* Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="violet">
                        {toLabel(application.opportunity.type)}
                      </Badge>
                      <Badge tone={APPLICATION_STATUS_TONE[application.status]}>
                        {toLabel(application.status)}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h2 className="mt-3 line-clamp-2 text-base font-semibold text-foreground">
                      {application.opportunity.title}
                    </h2>

                    {teamView && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {application.user.name}
                      </p>
                    )}

                    {/* Skill-fit meter — pinned toward the bottom */}
                    <div className="mt-auto pt-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Skill fit</span>
                        {hasFit ? (
                          <span className={cn('font-semibold', tone.text)}>
                            {score}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Not scored
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={hasFit ? score : undefined}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Skill fit"
                      >
                        {hasFit && (
                          <div
                            className={cn('h-full rounded-full', tone.bar)}
                            style={{ width: `${score}%` }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Applied{' '}
                        {new Date(application.createdAt).toLocaleDateString()}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="h-9 rounded-lg px-4 text-sm font-medium"
              >
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ApplicationsContent />
    </Suspense>
  );
}

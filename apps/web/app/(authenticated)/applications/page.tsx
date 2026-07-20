'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, FileText, Search, TrendingUp } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useApplicationsInfinite } from '@/hooks/use-applications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@repo/contracts';

type StatusFilter = 'ALL' | ApplicationStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Withdrawn', value: 'WITHDRAWN' },
];

const STATUS_BADGE_COLORS: Record<ApplicationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
};

// Urgency-based sort: pending/actionable first, then resolved statuses
const STATUS_SORT_ORDER: Record<ApplicationStatus, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
  WITHDRAWN: 3,
};

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={cn(
        'h-9 rounded-lg px-3.5 text-sm font-medium',
        active
          ? 'bg-primary-base text-white hover:bg-primary-base/90'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
      )}
    >
      {children}
    </Button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ApplicationsContent() {
  const router = useRouter();
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
        <h1 className="text-2xl font-bold text-gray-900">
          {teamView ? 'Team Applications' : 'My Applications'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {teamView
            ? 'Review the opportunities your direct reports have applied to'
            : "Track the status of the opportunities you've applied to"}
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-lg border-gray-200 bg-white pl-10 text-sm"
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
        <div className="py-10 text-center text-red-500">
          Failed to load applications
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <FileText className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {statusFilter !== 'ALL'
              ? 'No applications match your filters'
              : teamView
                ? "Your team hasn't applied to any opportunities yet"
                : "You haven't applied to any opportunities yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((application) => (
            <Card
              key={application.id}
              className="gap-3 p-5 border-gray-200 shadow-sm cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/applications/${application.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {teamView && (
                    <span className="text-sm font-medium text-gray-500">
                      {application.user.name}
                      {' · '}
                    </span>
                  )}
                  <h2 className="text-base font-semibold text-gray-900">
                    {application.opportunity.title}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    {toLabel(application.opportunity.type)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      STATUS_BADGE_COLORS[application.status],
                    )}
                  >
                    {toLabel(application.status)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Applied {new Date(application.createdAt).toLocaleDateString()}
                </span>
                {application.fitScore != null && (
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {Math.round(application.fitScore)}% fit
                  </span>
                )}
              </div>
            </Card>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="h-9 rounded-lg border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
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

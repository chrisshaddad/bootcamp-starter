'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  ListChecks,
  Search,
  Users,
} from 'lucide-react';
import { useOpportunitiesInfinite } from '@/hooks/use-opportunities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  OPPORTUNITY_STATUS_TONE,
  OPPORTUNITY_TYPE_TONE,
  toLabel,
} from '@/lib/labels';
import type { OpportunityStatus, OpportunityType } from '@repo/contracts';

type StatusFilter = 'ALL' | OpportunityStatus;

// Literal class strings (not built dynamically) so Tailwind's scanner picks
// them up - mirrors OPPORTUNITY_TYPE_TONE's category coloring as a solid
// header strip per card.
const TYPE_ACCENT: Record<OpportunityType, string> = {
  ROLE: 'bg-violet',
  PROJECT: 'bg-warning',
  ROTATION: 'bg-blush',
};

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Filled', value: 'FILLED' },
  { label: 'All Status', value: 'ALL' },
];

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
        <Skeleton key={i} className="h-52 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function OpportunitiesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');

  const { opportunities, isLoading, hasMore, isLoadingMore, loadMore, error } =
    useOpportunitiesInfinite({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    });

  const types = useMemo(() => {
    const unique = new Set((opportunities ?? []).map((o) => o.type));
    return Array.from(unique);
  }, [opportunities]);

  const filtered = useMemo(() => {
    return (opportunities ?? []).filter((opportunity) => {
      if (typeFilter !== 'ALL' && opportunity.type !== typeFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const term = search.trim().toLowerCase();
      return (
        opportunity.title.toLowerCase().includes(term) ||
        opportunity.description?.toLowerCase().includes(term)
      );
    });
  }, [opportunities, typeFilter, search]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover internal roles, projects, and rotations
        </p>
      </div>

      {/* Search + filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search opportunities"
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

        {types.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <FilterButton
              active={typeFilter === 'ALL'}
              onClick={() => setTypeFilter('ALL')}
            >
              All Types
            </FilterButton>
            {types.map((type) => (
              <FilterButton
                key={type}
                active={typeFilter === type}
                onClick={() => setTypeFilter(type)}
              >
                {toLabel(type)}
              </FilterButton>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Failed to load opportunities
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please refresh the page or try again later.
          </p>
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            No opportunities match your filters
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or status filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'opportunity' : 'opportunities'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((opportunity) => (
              <Link
                key={opportunity.id}
                href={`/opportunities/${opportunity.id}`}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="h-full gap-0 overflow-hidden p-0 transition-shadow group-hover:shadow-md">
                  {/* Category accent strip */}
                  <div
                    className={cn(
                      'h-1.5 w-full',
                      TYPE_ACCENT[opportunity.type],
                    )}
                  />

                  <div className="flex h-full flex-col p-5">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={OPPORTUNITY_TYPE_TONE[opportunity.type]}>
                        {toLabel(opportunity.type)}
                      </Badge>
                      <Badge tone={OPPORTUNITY_STATUS_TONE[opportunity.status]}>
                        {toLabel(opportunity.status)}
                      </Badge>
                      {opportunity.hasApplied && (
                        <Badge tone="success" className="gap-1">
                          <BadgeCheck className="h-3 w-3" />
                          Applied
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="mt-3 line-clamp-2 text-base font-semibold text-foreground">
                      {opportunity.title}
                    </h2>

                    {/* Department / level */}
                    {(opportunity.department || opportunity.requiredLevel) && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {opportunity.department?.name}
                          {opportunity.department && opportunity.requiredLevel
                            ? ' · '
                            : ''}
                          {opportunity.requiredLevel
                            ? `L${opportunity.requiredLevel}+`
                            : ''}
                        </span>
                      </p>
                    )}

                    {/* Description */}
                    <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                      {opportunity.description || 'No description provided.'}
                    </p>

                    {/* Meta footer — pinned to bottom for equal alignment */}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {opportunity.applicationCount} applied
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        {opportunity.requiredSkills.length} skills
                      </span>
                      {opportunity.deadline && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(opportunity.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
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

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, ListChecks, Search, Users } from 'lucide-react';
import { useOpportunities } from '@/hooks/use-opportunities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { OpportunityStatus } from '@repo/contracts';

type StatusFilter = 'ALL' | OpportunityStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Filled', value: 'FILLED' },
  { label: 'All Status', value: 'ALL' },
];

const STATUS_BADGE_COLORS: Record<OpportunityStatus, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  FILLED: 'bg-blue-100 text-blue-700',
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
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function OpportunitiesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');

  const { opportunities, isLoading, error } = useOpportunities({
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
        <p className="mt-1 text-sm text-gray-500">
          Discover internal roles, projects, and rotations
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-lg border-gray-200 bg-white pl-10 text-sm"
          />
        </div>

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

        <div className="ml-auto flex flex-wrap items-center gap-2">
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
          Failed to load opportunities
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <Briefcase className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No opportunities match your filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((opportunity) => (
            <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="block">
            <Card
              className="gap-3 p-5 border-gray-200 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">
                    {opportunity.title}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    {toLabel(opportunity.type)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      STATUS_BADGE_COLORS[opportunity.status],
                    )}
                  >
                    {toLabel(opportunity.status)}
                  </span>
                </div>
              </div>

              {(opportunity.department || opportunity.requiredLevel) && (
                <p className="text-sm text-gray-500">
                  {opportunity.department?.name}
                  {opportunity.department && opportunity.requiredLevel
                    ? ' · '
                    : ''}
                  {opportunity.requiredLevel
                    ? `L${opportunity.requiredLevel}+`
                    : ''}
                </p>
              )}

              {opportunity.description && (
                <p className="line-clamp-2 text-sm text-gray-600">
                  {opportunity.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {opportunity.applicationCount} applied
                </span>
                {opportunity.deadline && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Due {new Date(opportunity.deadline).toLocaleDateString()}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  {opportunity.requiredSkills.length} required skills
                </span>
              </div>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

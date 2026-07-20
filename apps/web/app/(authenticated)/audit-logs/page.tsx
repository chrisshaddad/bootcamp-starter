'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  UserPlus,
  FileEdit,
  Trash2,
  Calendar,
  Fingerprint,
  Dumbbell,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AuditLogResponse } from '@repo/contracts';

const ENTITY_TYPES = [
  { label: 'All', value: 'All' },
  { label: 'Members', value: 'MEMBER' },
  { label: 'Plans', value: 'PLAN' },
  { label: 'Subscriptions', value: 'SUBSCRIPTION' },
  { label: 'Sessions', value: 'SESSION' },
  { label: 'Bookings', value: 'BOOKING' },
  { label: 'Check-ins', value: 'CHECK_IN' },
  { label: 'Instructors', value: 'INSTRUCTOR' },
  { label: 'Gym', value: 'GYM' },
];

function getActionDetails(action: string, entityType: string) {
  const normalizedAction = action.toUpperCase();

  if (normalizedAction.includes('CREATE')) {
    return {
      icon: UserPlus,
      colorClass:
        'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    };
  }
  if (normalizedAction.includes('UPDATE')) {
    return {
      icon: FileEdit,
      colorClass:
        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    };
  }
  if (
    normalizedAction.includes('DELETE') ||
    normalizedAction.includes('CANCEL')
  ) {
    return {
      icon: Trash2,
      colorClass:
        'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };
  }
  if (entityType === 'CHECK_IN') {
    return {
      icon: Fingerprint,
      colorClass:
        'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    };
  }
  if (entityType === 'SESSION' || entityType === 'BOOKING') {
    return {
      icon: Calendar,
      colorClass:
        'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    };
  }
  if (entityType === 'INSTRUCTOR') {
    return {
      icon: Dumbbell,
      colorClass:
        'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
  }

  return {
    icon: Shield,
    colorClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
}

function formatActionText(log: AuditLogResponse) {
  const actionLower = log.action.toLowerCase().replace(/_/g, ' ');
  const entityTypeLower = log.entityType.toLowerCase().replace(/_/g, ' ');

  return (
    <span>
      <span className="font-semibold text-foreground">{log.userName}</span>{' '}
      <span className="text-muted-foreground">
        {actionLower} {entityTypeLower}
      </span>{' '}
      {log.entityName && (
        <span className="font-semibold text-foreground">{log.entityName}</span>
      )}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const { auditLogs, total, totalPages, isLoading, error } = useAuditLogs({
    page: currentPage,
    limit: 20,
    entityType: activeFilter !== 'All' ? activeFilter : undefined,
  });

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Failed to load activity log
        </h2>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track changes and activities across your gym
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pb-2">
        {ENTITY_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setActiveFilter(type.value)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border',
              activeFilter === type.value
                ? 'bg-primary-base border-primary-base text-white shadow-sm'
                : 'bg-transparent border-gray-200 text-gray-600 hover:border-primary-base dark:border-gray-700 dark:text-gray-300 dark:hover:border-primary-base',
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {!auditLogs?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-xl">
          <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            No activity found
          </h3>
          <p className="text-muted-foreground text-sm">
            {activeFilter !== 'All'
              ? `There is no recent activity for ${activeFilter.toLowerCase().replace(/_/g, ' ')}.`
              : 'There is no recent activity to display.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-stagger relative before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {auditLogs.map((log) => {
            const { icon: ActionIcon, colorClass } = getActionDetails(
              log.action,
              log.entityType,
            );

            return (
              <div
                key={log.id}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 absolute left-3 md:left-1/2 md:transform md:-translate-x-1/2">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      colorClass,
                    )}
                  >
                    <ActionIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Card */}
                <div className="glass-card rounded-xl p-4 w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-16 md:ml-0 card-elevated hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <div className="text-sm">{formatActionText(log)}</div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                      {log.entityType.replace(/_/g, ' ')}
                    </span>
                    {log.ipAddress && (
                      <span className="text-[10px] text-muted-foreground/60 hidden sm:inline-block">
                        IP: {log.ipAddress}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs">
            <span>Showing</span>
            <span className="font-semibold text-foreground">
              {(currentPage - 1) * 20 + 1} –{' '}
              {Math.min(currentPage * 20, total || 0)}
            </span>
            <span>of</span>
            <span className="rounded-md bg-primary-100 dark:bg-primary-950/60 px-1.5 py-0.5 font-bold text-primary-base">
              {total}
            </span>
            <span>entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 rounded-lg px-3 text-xs font-medium"
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 rounded-lg px-3 text-xs font-medium"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

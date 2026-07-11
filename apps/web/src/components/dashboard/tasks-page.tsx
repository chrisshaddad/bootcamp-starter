'use client';

import { WrenchIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

import { useListMaintenanceRequestsQuery } from '@/store/api/endpoints/maintenance-requests.api';
import type {
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
} from '@/types/api';

// ── Status / priority badges ────────────────────────────────────────────────

const STATUS_LABELS: Record<MaintenanceRequestStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_STYLES: Record<MaintenanceRequestStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground border-transparent',
};

function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceRequestStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

const PRIORITY_LABELS: Record<MaintenanceRequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const PRIORITY_STYLES: Record<MaintenanceRequestPriority, string> = {
  low: 'bg-muted text-muted-foreground border-transparent',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

function MaintenancePriorityBadge({
  priority,
}: {
  priority: MaintenanceRequestPriority;
}) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority]}>
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TasksPageProps {
  /** When false (non-admin), hide all write actions. Reserved for issue 007. */
  canWrite: boolean;
}

export function TasksPage({ canWrite }: TasksPageProps) {
  const {
    data: requests,
    isLoading,
    isError,
  } = useListMaintenanceRequestsQuery();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {canWrite
            ? 'Maintenance requests for your assigned buildings.'
            : 'Maintenance requests for your assigned buildings, read-only.'}
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Apartment</TableHead>
              <TableHead>Renter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  Failed to load maintenance requests. Please try again.
                </TableCell>
              </TableRow>
            ) : requests?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No maintenance requests yet.
                </TableCell>
              </TableRow>
            ) : (
              requests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <span className="font-medium text-sm">{request.title}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {request.apartmentUnitNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {request.renterName}
                  </TableCell>
                  <TableCell>
                    <MaintenanceStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    <MaintenancePriorityBadge priority={request.priority} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

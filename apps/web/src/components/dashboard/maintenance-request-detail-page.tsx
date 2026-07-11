'use client';

import Link from 'next/link';
import { ArrowLeftIcon, ClipboardListIcon, WrenchIcon } from 'lucide-react';

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

import { useGetMaintenanceRequestQuery } from '@/store/api/endpoints/maintenance-requests.api';
import { useListVendorsQuery } from '@/store/api/endpoints/vendors.api';
import { useListUsersQuery } from '@/store/api/endpoints/users.api';
import type {
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
  WorkOrderStatus,
} from '@/types/api';

// ── Maintenance request status / priority badges ────────────────────────────

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

// ── Work order status badge ─────────────────────────────────────────────────

const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  canceled: 'Canceled',
};

const WORK_ORDER_STATUS_STYLES: Record<WorkOrderStatus, string> = {
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  canceled: 'bg-muted text-muted-foreground border-transparent',
};

function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <Badge variant="outline" className={WORK_ORDER_STATUS_STYLES[status]}>
      {WORK_ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MaintenanceRequestDetailPageProps {
  id: string;
  locale: string;
}

export function MaintenanceRequestDetailPage({
  id,
  locale,
}: MaintenanceRequestDetailPageProps) {
  const {
    data: request,
    isLoading,
    isError,
  } = useGetMaintenanceRequestQuery(id);
  const { data: vendors } = useListVendorsQuery();
  const { data: users } = useListUsersQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href={`/${locale}/dashboard/tasks`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to tasks
        </Link>
        <p className="text-sm text-muted-foreground">
          Failed to load this maintenance request.
        </p>
      </div>
    );
  }

  function assigneeLabel(workOrder: {
    vendorId?: string | null;
    assignedUserId?: string | null;
  }) {
    if (workOrder.vendorId) {
      return (
        vendors?.find((v) => v.id === workOrder.vendorId)?.companyName ??
        workOrder.vendorId
      );
    }
    if (workOrder.assignedUserId) {
      const member = users?.find((u) => u.userId === workOrder.assignedUserId);
      return (
        member?.user?.fullName ??
        member?.username ??
        member?.user?.email ??
        workOrder.assignedUserId
      );
    }
    return '—';
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/dashboard/tasks`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to tasks
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardListIcon className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {request.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MaintenanceStatusBadge status={request.status} />
          <MaintenancePriorityBadge priority={request.priority} />
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Apartment</p>
          <p className="text-sm font-medium">{request.apartmentUnitNumber}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Renter</p>
          <p className="text-sm font-medium">{request.renterName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Description</p>
          <p className="text-sm font-medium">{request.description || '—'}</p>
        </div>
        {request.notes && (
          <div className="sm:col-span-3">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm font-medium">{request.notes}</p>
          </div>
        )}
      </div>

      {/* Work order history */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Work orders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Job history for this maintenance request.
        </p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Vendor / Assignee</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Resolution notes</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.workOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No work orders yet.
                </TableCell>
              </TableRow>
            ) : (
              request.workOrders.map((workOrder) => (
                <TableRow key={workOrder.id}>
                  <TableCell>
                    <WorkOrderStatusBadge status={workOrder.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {assigneeLabel(workOrder)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {workOrder.cost ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {workOrder.resolutionNotes ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {workOrder.completedAt
                      ? new Date(workOrder.completedAt).toLocaleDateString()
                      : '—'}
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

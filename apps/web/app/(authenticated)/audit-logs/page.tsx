'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ScrollText } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const AUDIT_LOGS_PAGE_SIZE = 20;

// Tenant-scoped entity types only ever appear in a specific gym's own audit
// trail (gymId set) — SUPER_ADMIN's view is scoped to platform-level events
// only (gymId: null), so these filter options would always return nothing.
const TENANT_ENTITY_TYPES = [
  { label: 'All activity', value: 'all' },
  { label: 'Members', value: 'Member' },
  { label: 'Plans', value: 'MembershipPlan' },
  { label: 'Subscriptions', value: 'Subscription' },
  { label: 'Sessions', value: 'GymSession' },
  { label: 'Bookings', value: 'SessionBooking' },
  { label: 'Check-ins', value: 'CheckIn' },
  { label: 'Instructors', value: 'Instructor' },
  // Labeled "Settings" here (not "Gym") because the only Gym-entityType event
  // an ORG_ADMIN can ever see is their own gym.settings-updated — the platform
  // lifecycle events (approved/suspended/reactivated) log with gymId: null,
  // so they never surface in a tenant-scoped view.
  { label: 'Settings', value: 'Gym' },
];

const PLATFORM_ENTITY_TYPES = [
  { label: 'All activity', value: 'all' },
  { label: 'Gym', value: 'Gym' },
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Member: 'Member',
  MembershipPlan: 'Plan',
  Subscription: 'Subscription',
  GymSession: 'Session',
  SessionBooking: 'Booking',
  CheckIn: 'CheckIn',
  Instructor: 'Instructor',
  Gym: 'Gym',
};

/** created/approved reads positive, cancel/deactivate/reject/suspend reads negative, everything else is a neutral update */
function actionBadgeClass(action: string): string {
  if (action.includes('created') || action.includes('approved')) {
    return 'bg-success/10 text-success';
  }
  if (
    action.includes('cancelled') ||
    action.includes('deactivated') ||
    action.includes('rejected') ||
    action.includes('suspended')
  ) {
    return 'bg-destructive/10 text-destructive';
  }
  return 'bg-warning/10 text-warning-dark';
}

/** 'member.created' -> 'created', 'checkin.checked-out' -> 'checked out' */
function formatAction(action: string): string {
  const verb = action.split('.')[1] ?? action;
  return verb.replace(/-/g, ' ');
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const entityTypes = isSuperAdmin
    ? PLATFORM_ENTITY_TYPES
    : TENANT_ENTITY_TYPES;

  const [entityType, setEntityType] = useState('all');
  const [page, setPage] = useState(1);

  const { auditLogs, total, totalPages, isLoading, error } = useAuditLogs({
    page,
    limit: AUDIT_LOGS_PAGE_SIZE,
    entityType: entityType === 'all' ? undefined : entityType,
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin
              ? 'A record of gym approvals, suspensions, and reactivations across the platform'
              : 'A record of every action taken in your gym'}
          </p>
        </div>
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Activity
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-10 text-center text-error">
              Failed to load audit log
            </div>
          ) : !auditLogs?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No activity recorded yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell
                      className="text-sm whitespace-nowrap text-muted-foreground"
                      title={format(new Date(log.createdAt), 'PPpp')}
                    >
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {log.userName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${actionBadgeClass(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="mr-1.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
                      </span>
                      <span className="text-foreground">
                        {log.entityName ?? log.entityId}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading &&
            !error &&
            total !== undefined &&
            totalPages &&
            totalPages > 1 && (
              <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * AUDIT_LOGS_PAGE_SIZE + 1}–
                  {Math.min(page * AUDIT_LOGS_PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

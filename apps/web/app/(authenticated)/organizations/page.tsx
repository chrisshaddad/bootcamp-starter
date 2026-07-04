'use client';

import { useUser } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';
import { useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ShieldX } from 'lucide-react';
import { useState } from 'react';
import type { OrganizationStatus } from '@repo/contracts';

type StatusFilter =
  | 'all'
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-300',
  ACTIVE: 'bg-green-500/15 text-green-300',
  REJECTED: 'bg-red-500/15 text-red-300',
  SUSPENDED: 'bg-orange-500/15 text-orange-300',
  INACTIVE: 'bg-muted text-muted-foreground',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-muted text-muted-foreground'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="text-destructive mb-4 h-16 w-16" />
      <h1 className="text-foreground mb-2 text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground max-w-md text-center">
        You don&apos;t have permission to access this page. Only Super Admins
        can manage organizations.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-40" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // FIX: Change 'user?.role' to 'user?.accountType'
  const isSuperAdmin = user?.accountType === 'SUPER_ADMIN';

  const {
    organizations,
    total,
    isLoading: orgsLoading,
    error,
  } = useOrganizations({
    status:
      statusFilter === 'all' ? undefined : (statusFilter as OrganizationStatus),
    enabled: isSuperAdmin,
  });

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  // FIX: Change 'user?.role' to 'user?.accountType'
  if (user?.accountType !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage organization registrations and approvals
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations
            {total !== undefined && (
              <span className="text-muted-foreground text-sm font-normal">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-destructive py-10 text-center">
              Failed to load organizations
            </div>
          ) : !organizations?.length ? (
            <div className="text-muted-foreground py-10 text-center">
              No organizations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/organizations/${org.id}`)}
                  >
                    <TableCell>
                      <div>
                        <div className="text-foreground font-medium">
                          {org.name}
                        </div>
                        {org.website && (
                          <div className="text-muted-foreground text-sm">
                            {org.website}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={org.status} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-foreground text-sm">
                          {org.createdBy.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {org.createdBy.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {org._count.users}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

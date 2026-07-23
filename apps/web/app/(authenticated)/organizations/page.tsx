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
import { Button } from '@/components/ui/button';
import { ForbiddenPage } from '@/components/forbidden-page';
import { OrganizationFormDialog } from '@/components/organization-form-dialog';
import { Building2, Plus } from 'lucide-react';
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
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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

  // Show 403 for non-super admins
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <ForbiddenPage message="Only Super Admins can manage organizations." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
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
          <Button
            className="gap-2 bg-primary-base hover:bg-primary-base/90"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Create Organization
          </Button>
        </div>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
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
            <div className="py-10 text-center text-red-500">
              Failed to load organizations
            </div>
          ) : !organizations?.length ? (
            <div className="py-10 text-center text-gray-500">
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
                        <div className="font-medium text-gray-900">
                          {org.name}
                        </div>
                        {org.website && (
                          <div className="text-sm text-gray-500">
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
                        <div className="text-sm text-gray-900">
                          {org.createdBy.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {org.createdBy.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {org._count.users}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OrganizationFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}

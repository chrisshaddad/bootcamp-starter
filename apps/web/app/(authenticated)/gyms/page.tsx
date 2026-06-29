'use client';

import { useUser } from '@/hooks/use-auth';
import { useGyms } from '@/hooks/use-gyms';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ShieldX } from 'lucide-react';
import { useState } from 'react';
import type { GymStatus } from '@repo/contracts';

type StatusFilter = 'all' | GymStatus;

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
  SUSPENDED: 'bg-orange/15 text-orange',
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

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="h-16 w-16 text-red-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 text-center max-w-md">
        You don&apos;t have permission to access this page. Only Super Admins
        can manage gyms.
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

/** Auto-generated docstring */
export default function GymsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    gyms,
    total,
    isLoading: gymsLoading,
    error,
  } = useGyms({
    status: statusFilter === 'all' ? undefined : (statusFilter as GymStatus),
    page,
    enabled: isSuperAdmin,
  });
  const totalPages = Math.ceil((total ?? 0) / 20);

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gyms</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage gym registrations and approvals
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setPage(1);
            }}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gyms
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gymsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">
              Failed to load gyms
            </div>
          ) : !gyms?.length ? (
            <div className="py-10 text-center text-gray-500">No gyms found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gym</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gyms.map((gym) => (
                  <TableRow
                    key={gym.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/gyms/${gym.id}`)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {gym.name}
                        </div>
                        {gym.website && (
                          <div className="text-sm text-gray-500">
                            {gym.website}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={gym.status} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm text-gray-900">
                          {gym.createdBy.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {gym.createdBy.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {gym._count.users}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(gym.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!gymsLoading && !error && total !== undefined && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of{' '}
                {total}
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
                <span className="text-sm text-gray-600">
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

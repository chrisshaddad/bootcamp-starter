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
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { ShieldX } from 'lucide-react';
import { useState } from 'react';
import { cn, formatDate } from '@/lib/utils';
import type { OrganizationStatus } from '@repo/contracts';

type StatusFilter =
  | 'all'
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || 'OR';
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-danger" />
      <h1 className="mb-2 font-display text-2xl font-medium text-text-1">
        Access Denied
      </h1>
      <p className="max-w-md text-center text-text-2">
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
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      {/* Page head */}
      <div className="flex items-end justify-between gap-3.5">
        <div>
          <h1 className="font-display text-[26px] font-medium text-text-1">
            Organizations
          </h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Review registrations and manage approvals across the platform.
          </p>
        </div>
        {total !== undefined && (
          <div className="rounded-[11px] border border-border bg-surface px-[15px] py-3 shadow-sm">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-text-3">
              On record
            </div>
            <div className="mt-[3px] font-display text-[26px] font-medium text-text-1">
              {total}
            </div>
          </div>
        )}
      </div>

      {/* Deck table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {/* toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="h-8 w-44 text-[12.5px]">
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

        {orgsLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="py-10 text-center text-danger">
            Failed to load organizations
          </div>
        ) : !organizations?.length ? (
          <div className="py-10 text-center text-text-2">
            No organizations found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto w-10 border-r border-border bg-sunken px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  #
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Organization
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Status
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Created By
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Members
                </TableHead>
                <TableHead className="h-auto bg-sunken px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                  Registered
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org, i) => (
                <TableRow
                  key={org.id}
                  className="cursor-pointer hover:bg-amber/5"
                  onClick={() => router.push(`/organizations/${org.id}`)}
                >
                  <TableCell className="w-10 border-r border-border px-3.5 py-2.5 text-right font-mono text-[11px] text-text-3">
                    {String(i + 1).padStart(3, '0')}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white',
                          'bg-spine',
                        )}
                      >
                        {orgInitials(org.name)}
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-text-1">
                          {org.name}
                        </div>
                        {org.website && (
                          <div className="font-mono text-[11px] text-text-3">
                            {org.website}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5">
                    <StatusBadge status={org.status} />
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5">
                    <div className="text-[13px] font-semibold text-text-1">
                      {org.createdBy.name}
                    </div>
                    <div className="font-mono text-[11px] text-text-3">
                      {org.createdBy.email}
                    </div>
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 text-[13px] text-text-2">
                    {org._count.users}
                  </TableCell>
                  <TableCell className="px-3.5 py-2.5 font-mono text-[12px] text-text-2">
                    {formatDate(org.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

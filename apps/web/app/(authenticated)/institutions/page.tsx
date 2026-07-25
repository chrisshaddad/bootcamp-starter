'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/use-auth';
import {
  useInstitutions,
  useCreateInstitution,
  useInstitutionActions,
} from '@/hooks/use-institutions';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
import { Pagination } from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  institutionCreateRequestSchema,
  DEFAULT_PAGE_SIZE,
  type InstitutionCreateRequest,
  type InstitutionStatus,
} from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { StatusBadge } from '@/components/status-badge';
import { StatTile } from '@/components/stat-tile';
import { ForbiddenPage } from '@/components/forbidden-page';

type StatusFilter =
  | 'all'
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

const STATUS_FILTERS: StatusFilter[] = [
  'all',
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
  'INACTIVE',
];

function parseStatusFilter(value: string | null): StatusFilter {
  return STATUS_FILTERS.includes(value as StatusFilter)
    ? (value as StatusFilter)
    : 'all';
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

function CreateInstitutionDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createInstitution } = useCreateInstitution();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstitutionCreateRequest>({
    resolver: zodResolver(institutionCreateRequestSchema),
  });

  const onSubmit = async (data: InstitutionCreateRequest) => {
    setIsSubmitting(true);
    try {
      await createInstitution(data);
      toast.success('Institution created successfully');
      reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Institution
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Institution</DialogTitle>
          <DialogDescription>
            Creates the institution along with its first admin user.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Institution Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              {...register('type')}
            >
              <option value="CLINIC">Clinic</option>
              <option value="HOSPITAL">Hospital</option>
              <option value="LAB">Lab</option>
            </select>
            {errors.type && (
              <p className="text-sm text-error">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin.fullName">Admin Full Name</Label>
            <Input id="admin.fullName" {...register('admin.fullName')} />
            {errors.admin?.fullName && (
              <p className="text-sm text-error">
                {errors.admin.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin.email">Admin Email</Label>
            <Input id="admin.email" type="email" {...register('admin.email')} />
            {errors.admin?.email && (
              <p className="text-sm text-error">{errors.admin.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin.phone">Admin Phone</Label>
            <Input id="admin.phone" {...register('admin.phone')} />
            {errors.admin?.phone && (
              <p className="text-sm text-error">{errors.admin.phone.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Headline counts across every institution. Each tile is its own filtered
 * count query (the list endpoint returns a `total` per status filter), so a
 * shrinking limit keeps the payloads tiny — we only need the totals.
 */
function InstitutionStats({ enabled }: { enabled: boolean }) {
  const all = useInstitutions({ limit: 1, enabled });
  const pending = useInstitutions({ status: 'PENDING', limit: 1, enabled });
  const active = useInstitutions({ status: 'ACTIVE', limit: 1, enabled });
  const suspended = useInstitutions({ status: 'SUSPENDED', limit: 1, enabled });

  const isLoading =
    all.isLoading ||
    pending.isLoading ||
    active.isLoading ||
    suspended.isLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Total institutions"
        value={all.total ?? 0}
        icon={Building2}
      />
      <StatTile
        label="Pending approval"
        value={pending.total ?? 0}
        icon={Clock}
      />
      <StatTile label="Active" value={active.total ?? 0} icon={CheckCircle} />
      <StatTile label="Suspended" value={suspended.total ?? 0} icon={Ban} />
    </div>
  );
}

/**
 * A work queue of institutions awaiting review, with inline approve/reject.
 * Renders nothing when there's nothing pending, so it stays out of the way.
 */
function PendingApprovals({ enabled }: { enabled: boolean }) {
  const { institutions, isLoading, mutate } = useInstitutions({
    status: 'PENDING',
    limit: 100,
    enabled,
  });
  const { approve, reject } = useInstitutionActions();
  // id currently being acted on, so we can disable just that row's buttons
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleAction = async (
    id: string,
    name: string,
    action: 'approve' | 'reject',
  ) => {
    setPendingId(id);
    try {
      await (action === 'approve' ? approve(id) : reject(id));
      toast.success(
        action === 'approve' ? `${name} approved` : `${name} rejected`,
      );
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : `Failed to ${action} institution`,
      );
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading || !institutions?.length) return null;

  return (
    <Card className="border-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning-dark">
          <Clock className="h-5 w-5" />
          Pending approval
          <span className="text-sm font-normal text-muted-foreground">
            ({institutions.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {institutions.map((institution) => (
            <li
              key={institution.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/institutions/${institution.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {institution.name}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {institution.type} · Registered{' '}
                  {new Date(institution.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-error border-error-light hover:bg-error-light"
                  disabled={pendingId === institution.id}
                  onClick={() =>
                    handleAction(institution.id, institution.name, 'reject')
                  }
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-success hover:bg-success-dark"
                  disabled={pendingId === institution.id}
                  onClick={() =>
                    handleAction(institution.id, institution.name, 'approve')
                  }
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function InstitutionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get('status')),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    institutions,
    total,
    isLoading: institutionsLoading,
    error,
  } = useInstitutions({
    status:
      statusFilter === 'all' ? undefined : (statusFilter as InstitutionStatus),
    page,
    limit: pageSize,
    enabled: isSuperAdmin,
  });

  // Clamp back to the last valid page if a filter/pageSize change or a
  // background revalidation shrinks `total` out from under the current page.
  useEffect(() => {
    if (total === undefined) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [total, pageSize, page]);

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  // Show 403 for non-super admins
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <ForbiddenPage message="You don't have permission to access this page. Only Super Admins can manage institutions." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Institutions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage institution registrations and approvals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
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
          <CreateInstitutionDialog />
        </div>
      </div>

      {/* Summary stats across all institutions */}
      <InstitutionStats enabled={isSuperAdmin} />

      {/* Work queue: institutions awaiting review */}
      <PendingApprovals enabled={isSuperAdmin} />

      {/* Institutions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Institutions
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {institutionsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load institutions
            </div>
          ) : !institutions?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No institutions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.map((institution) => (
                  <TableRow
                    key={institution.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/institutions/${institution.id}`)
                    }
                  >
                    <TableCell>
                      <Link
                        href={`/institutions/${institution.id}`}
                        className="font-medium text-foreground hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {institution.name}
                      </Link>
                      {institution.address && (
                        <div className="text-sm text-muted-foreground">
                          {institution.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {institution.type}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={institution.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {institution._count.users}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(institution.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {total !== undefined && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

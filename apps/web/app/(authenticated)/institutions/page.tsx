'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/use-auth';
import {
  useInstitutions,
  useCreateInstitution,
} from '@/hooks/use-institutions';
import { useRouter } from 'next/navigation';
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
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  institutionCreateRequestSchema,
  type InstitutionCreateRequest,
  type InstitutionStatus,
} from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { StatusBadge } from '@/components/status-badge';
import { ForbiddenPage } from '@/components/forbidden-page';

type StatusFilter =
  | 'all'
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InstitutionsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    institutions,
    total,
    isLoading: institutionsLoading,
    error,
  } = useInstitutions({
    status:
      statusFilter === 'all' ? undefined : (statusFilter as InstitutionStatus),
    enabled: isSuperAdmin,
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Institutions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage institution registrations and approvals
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
          <CreateInstitutionDialog />
        </div>
      </div>

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
        </CardContent>
      </Card>
    </div>
  );
}

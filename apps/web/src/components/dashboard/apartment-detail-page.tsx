'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  DoorOpenIcon,
  FileTextIcon,
  PlusIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  XCircleIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import { useGetBuildingQuery } from '@/store/api/endpoints/buildings.api';
import { useGetFloorQuery } from '@/store/api/endpoints/floors.api';
import { useGetApartmentQuery } from '@/store/api/endpoints/apartments.api';
import { useListRentersQuery } from '@/store/api/endpoints/renters.api';
import {
  useListLeasesQuery,
  useCreateLeaseMutation,
  useUpdateLeaseMutation,
  useRenewLeaseMutation,
} from '@/store/api/endpoints/leases.api';
import type { ApartmentStatus, LeaseResponse, LeaseStatus } from '@/types/api';

// ── Apartment status badge ──────────────────────────────────────────────────

function ApartmentStatusBadge({ status }: { status: ApartmentStatus }) {
  switch (status) {
    case 'occupied':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Occupied
        </Badge>
      );
    case 'maintenance':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          Maintenance
        </Badge>
      );
    case 'unavailable':
      return <Badge variant="destructive">Unavailable</Badge>;
    case 'vacant':
    default:
      return <Badge variant="secondary">Vacant</Badge>;
  }
}

// ── Lease effective-status badge ────────────────────────────────────────────

function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Active
        </Badge>
      );
    case 'expired':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          Expired
        </Badge>
      );
    case 'terminated':
      return <Badge variant="destructive">Terminated</Badge>;
    case 'draft':
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

// ── Zod schema ───────────────────────────────────────────────────────────────

const numericField = (label: string) =>
  z
    .string()
    .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), {
      message: `${label} must be a number`,
    })
    .refine((v) => Number(v) >= 0, { message: `${label} cannot be negative` });

const leaseSchema = z
  .object({
    renterId: z.string().min(1, 'Renter is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    rentAmount: numericField('Rent amount'),
    depositAmount: numericField('Deposit amount'),
    renewalTerms: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
type LeaseFormValues = z.infer<typeof leaseSchema>;

const DEFAULT_VALUES: LeaseFormValues = {
  renterId: '',
  startDate: '',
  endDate: '',
  rentAmount: '',
  depositAmount: '',
  renewalTerms: '',
  notes: '',
};

const renewSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    rentAmount: numericField('Rent amount'),
    depositAmount: numericField('Deposit amount'),
    renewalTerms: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
type RenewFormValues = z.infer<typeof renewSchema>;

// ── Main component ────────────────────────────────────────────────────────────

interface ApartmentDetailPageProps {
  buildingId: string;
  floorId: string;
  apartmentId: string;
  canWrite: boolean;
  locale: string;
}

export function ApartmentDetailPage({
  buildingId,
  floorId,
  apartmentId,
  canWrite,
  locale,
}: ApartmentDetailPageProps) {
  const { data: building } = useGetBuildingQuery(buildingId);
  const { data: floor } = useGetFloorQuery({ buildingId, floorId });
  const { data: apartment, isLoading: apartmentLoading } = useGetApartmentQuery(
    { buildingId, floorId, apartmentId },
  );
  const { data: renters } = useListRentersQuery();
  const { data: leases, isLoading: leasesLoading } = useListLeasesQuery({
    buildingId,
    floorId,
    apartmentId,
  });
  const [createLease, { isLoading: creating }] = useCreateLeaseMutation();
  const [updateLease, { isLoading: terminating }] = useUpdateLeaseMutation();
  const [renewLease, { isLoading: renewing }] = useRenewLeaseMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<LeaseResponse | null>(
    null,
  );
  const [renewTarget, setRenewTarget] = useState<LeaseResponse | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    register: regRenew,
    handleSubmit: handleRenewSubmit,
    reset: resetRenew,
    formState: { errors: renewErrors },
  } = useForm<RenewFormValues>({
    resolver: zodResolver(renewSchema),
  });

  async function onCreateSubmit(values: LeaseFormValues) {
    try {
      await createLease({
        buildingId,
        floorId,
        apartmentId,
        body: {
          renterId: values.renterId,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString(),
          rentAmount: Number(values.rentAmount),
          depositAmount: Number(values.depositAmount),
          renewalTerms: values.renewalTerms || undefined,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success('Lease created.');
      setCreateOpen(false);
      reset(DEFAULT_VALUES);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to create lease.');
    }
  }

  async function handleTerminate() {
    if (!terminateTarget) return;
    try {
      await updateLease({
        buildingId,
        floorId,
        apartmentId,
        leaseId: terminateTarget.id,
        body: { status: 'terminated' },
      }).unwrap();
      toast.success('Lease terminated.');
      setTerminateTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to terminate lease.');
    }
  }

  function openRenew(lease: LeaseResponse) {
    setRenewTarget(lease);
    resetRenew({
      startDate: '',
      endDate: '',
      rentAmount: lease.rentAmount,
      depositAmount: lease.depositAmount,
      renewalTerms: lease.renewalTerms ?? '',
      notes: lease.notes ?? '',
    });
  }

  async function onRenewSubmit(values: RenewFormValues) {
    if (!renewTarget) return;
    try {
      await renewLease({
        buildingId,
        floorId,
        apartmentId,
        leaseId: renewTarget.id,
        body: {
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString(),
          rentAmount: Number(values.rentAmount),
          depositAmount: Number(values.depositAmount),
          renewalTerms: values.renewalTerms || undefined,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success('Lease renewed.');
      setRenewTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to renew lease.');
    }
  }

  if (apartmentLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href={`/${locale}/dashboard/buildings/${buildingId}/floors/${floorId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        {floor?.name ?? 'Back to floor'}
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <DoorOpenIcon className="size-6 text-muted-foreground" />
          Unit {apartment?.unitNumber ?? ''}
        </h1>
        {apartment && <ApartmentStatusBadge status={apartment.status} />}
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Building</p>
          <p className="text-sm">{building?.name ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Bed / Bath</p>
          <p className="text-sm">
            {apartment?.bedrooms} bd / {Number(apartment?.bathrooms)} ba
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Sqft</p>
          <p className="text-sm">{apartment?.sqft ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-3">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-sm whitespace-pre-wrap">
            {apartment?.notes ?? '—'}
          </p>
        </div>
      </div>

      {/* Leases section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Leases</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? 'Manage leases for this apartment.'
              : 'Lease history for this apartment.'}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              reset(DEFAULT_VALUES);
              setCreateOpen(true);
            }}
          >
            <PlusIcon />
            New lease
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Renter</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Status</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leasesLoading ? (
              <>
                {[...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : leases?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <FileTextIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No leases yet.
                </TableCell>
              </TableRow>
            ) : (
              leases?.map((lease) => {
                const renter = renters?.find((r) => r.id === lease.renterId);
                return (
                  <TableRow key={lease.id}>
                    <TableCell>
                      <span className="font-medium text-sm">
                        {renter?.fullName ?? lease.renterId}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lease.startDate).toLocaleDateString()} –{' '}
                      {new Date(lease.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lease.rentAmount}
                    </TableCell>
                    <TableCell>
                      <LeaseStatusBadge status={lease.effectiveStatus} />
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        {lease.effectiveStatus === 'active' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Lease actions"
                                >
                                  <MoreHorizontalIcon />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openRenew(lease)}
                              >
                                <RefreshCwIcon className="size-3.5 mr-1.5" />
                                Renew
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setTerminateTarget(lease)}
                              >
                                <XCircleIcon className="size-3.5 mr-1.5" />
                                Terminate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── New Lease Dialog ───────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New lease</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-renter">
                Renter <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="renterId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="l-renter" className="w-full">
                      <SelectValue placeholder="Select a renter" />
                    </SelectTrigger>
                    <SelectContent>
                      {renters?.map((renter) => (
                        <SelectItem key={renter.id} value={renter.id}>
                          {renter.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.renterId && (
                <p className="text-xs text-destructive">
                  {errors.renterId.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-start">
                  Start date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="l-start"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-end">
                  End date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="l-end"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p className="text-xs text-destructive">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-rent">
                  Rent amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="l-rent"
                  type="number"
                  min={0}
                  step={0.01}
                  aria-invalid={!!errors.rentAmount}
                  {...register('rentAmount')}
                />
                {errors.rentAmount && (
                  <p className="text-xs text-destructive">
                    {errors.rentAmount.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-deposit">
                  Deposit amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="l-deposit"
                  type="number"
                  min={0}
                  step={0.01}
                  aria-invalid={!!errors.depositAmount}
                  {...register('depositAmount')}
                />
                {errors.depositAmount && (
                  <p className="text-xs text-destructive">
                    {errors.depositAmount.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-renewal">
                Renewal terms{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea id="l-renewal" rows={2} {...register('renewalTerms')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea id="l-notes" rows={2} {...register('notes')} />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  reset(DEFAULT_VALUES);
                }}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Terminate Confirm Dialog ───────────────────────────────────────── */}
      <Dialog
        open={!!terminateTarget}
        onOpenChange={(open) => {
          if (!open) setTerminateTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Terminate lease</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to terminate this lease? The apartment will
              be marked vacant. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setTerminateTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating}
            >
              {terminating ? 'Terminating…' : 'Terminate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Renew Lease Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!renewTarget}
        onOpenChange={(open) => {
          if (!open) setRenewTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renew lease</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleRenewSubmit(onRenewSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Renewing for{' '}
              <span className="font-medium text-foreground">
                {renters?.find((r) => r.id === renewTarget?.renterId)
                  ?.fullName ?? renewTarget?.renterId}
              </span>{' '}
              — Unit {apartment?.unitNumber}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rn-start">
                  Start date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rn-start"
                  type="date"
                  aria-invalid={!!renewErrors.startDate}
                  {...regRenew('startDate')}
                />
                {renewErrors.startDate && (
                  <p className="text-xs text-destructive">
                    {renewErrors.startDate.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rn-end">
                  End date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rn-end"
                  type="date"
                  aria-invalid={!!renewErrors.endDate}
                  {...regRenew('endDate')}
                />
                {renewErrors.endDate && (
                  <p className="text-xs text-destructive">
                    {renewErrors.endDate.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rn-rent">
                  Rent amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rn-rent"
                  type="number"
                  min={0}
                  step={0.01}
                  aria-invalid={!!renewErrors.rentAmount}
                  {...regRenew('rentAmount')}
                />
                {renewErrors.rentAmount && (
                  <p className="text-xs text-destructive">
                    {renewErrors.rentAmount.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rn-deposit">
                  Deposit amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rn-deposit"
                  type="number"
                  min={0}
                  step={0.01}
                  aria-invalid={!!renewErrors.depositAmount}
                  {...regRenew('depositAmount')}
                />
                {renewErrors.depositAmount && (
                  <p className="text-xs text-destructive">
                    {renewErrors.depositAmount.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rn-renewal">
                Renewal terms{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="rn-renewal"
                rows={2}
                {...regRenew('renewalTerms')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rn-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea id="rn-notes" rows={2} {...regRenew('notes')} />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setRenewTarget(null)}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={renewing}>
                {renewing ? 'Renewing…' : 'Renew'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

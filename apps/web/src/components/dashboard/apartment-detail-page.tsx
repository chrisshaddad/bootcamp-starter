'use client';

import { useMemo, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Apartment status badge ──────────────────────────────────────────────────

function ApartmentStatusBadge({
  status,
  labels,
}: {
  status: ApartmentStatus;
  labels: Dictionary['apartments']['status'];
}) {
  switch (status) {
    case 'occupied':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {labels.occupied}
        </Badge>
      );
    case 'maintenance':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          {labels.maintenance}
        </Badge>
      );
    case 'unavailable':
      return <Badge variant="destructive">{labels.unavailable}</Badge>;
    case 'vacant':
    default:
      return <Badge variant="secondary">{labels.vacant}</Badge>;
  }
}

// ── Lease effective-status badge (reuses dict.leases.status) ───────────────

function LeaseStatusBadge({
  status,
  labels,
}: {
  status: LeaseStatus;
  labels: Dictionary['leases']['status'];
}) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {labels.active}
        </Badge>
      );
    case 'expired':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          {labels.expired}
        </Badge>
      );
    case 'terminated':
      return <Badge variant="destructive">{labels.terminated}</Badge>;
    case 'draft':
    default:
      return <Badge variant="secondary">{labels.draft}</Badge>;
  }
}

// ── Zod schemas (built from dict so error messages are localized) ──────────

type DialogDict = Dictionary['apartments']['dialog'];

/**
 * Today as a local `YYYY-MM-DD` string — matches the value shape of a native
 * `<input type="date">` so it can be used directly as `min` and compared
 * lexically against form date strings.
 */
function todayDateInputValue(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function buildLeaseSchema(t: DialogDict) {
  const numericField = (label: string) =>
    z
      .string()
      .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), {
        message: t.errors.mustBeNumber.replace('{label}', label),
      })
      .refine((v) => Number(v) >= 0, {
        message: t.errors.cannotBeNegative.replace('{label}', label),
      });

  return z
    .object({
      renterId: z.string().min(1, t.errors.renter),
      startDate: z.string().min(1, t.errors.startDate),
      endDate: z.string().min(1, t.errors.endDate),
      rentAmount: numericField(t.fields.rentAmount),
      depositAmount: numericField(t.fields.depositAmount),
      renewalTerms: z.string().optional(),
      notes: z.string().optional(),
      // F4.3 (decision D3): a new active lease may not silently start in the
      // past unless the creator explicitly flags it as an existing lease.
      recordExisting: z.boolean(),
    })
    .refine((v) => v.endDate >= v.startDate, {
      message: t.errors.endAfterStart,
      path: ['endDate'],
    })
    .refine((v) => v.recordExisting || v.startDate >= todayDateInputValue(), {
      message: t.errors.pastStartDate,
      path: ['startDate'],
    });
}
type LeaseFormValues = z.infer<ReturnType<typeof buildLeaseSchema>>;

const DEFAULT_VALUES: LeaseFormValues = {
  renterId: '',
  startDate: '',
  endDate: '',
  rentAmount: '',
  depositAmount: '',
  renewalTerms: '',
  notes: '',
  recordExisting: false,
};

function buildRenewSchema(t: DialogDict) {
  const numericField = (label: string) =>
    z
      .string()
      .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), {
        message: t.errors.mustBeNumber.replace('{label}', label),
      })
      .refine((v) => Number(v) >= 0, {
        message: t.errors.cannotBeNegative.replace('{label}', label),
      });

  return z
    .object({
      startDate: z.string().min(1, t.errors.startDate),
      endDate: z.string().min(1, t.errors.endDate),
      rentAmount: numericField(t.fields.rentAmount),
      depositAmount: numericField(t.fields.depositAmount),
      renewalTerms: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine((v) => v.endDate >= v.startDate, {
      message: t.errors.endAfterStart,
      path: ['endDate'],
    });
}
type RenewFormValues = z.infer<ReturnType<typeof buildRenewSchema>>;

// ── Main component ────────────────────────────────────────────────────────────

interface ApartmentDetailPageProps {
  buildingId: string;
  floorId: string;
  apartmentId: string;
  canWrite: boolean;
  locale: string;
  dict: Dictionary;
}

export function ApartmentDetailPage({
  buildingId,
  floorId,
  apartmentId,
  canWrite,
  locale,
  dict,
}: ApartmentDetailPageProps) {
  const t = dict.apartments;
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

  const leaseSchema = useMemo(() => buildLeaseSchema(t.dialog), [t.dialog]);
  const renewSchema = useMemo(() => buildRenewSchema(t.dialog), [t.dialog]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const recordExisting = watch('recordExisting');
  const todayStr = todayDateInputValue();

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
          ...(values.recordExisting ? { recordExisting: true } : {}),
        },
      }).unwrap();
      toast.success(t.dialog.create.success);
      setCreateOpen(false);
      reset(DEFAULT_VALUES);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? t.dialog.create.genericError);
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
      toast.success(t.dialog.terminate.success);
      setTerminateTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? t.dialog.terminate.genericError);
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
      toast.success(t.dialog.renew.success);
      setRenewTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? t.dialog.renew.genericError);
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
        {floor?.name ?? t.header.backToFloor}
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <DoorOpenIcon className="size-6 text-muted-foreground" />
          {t.header.unit} {apartment?.unitNumber ?? ''}
        </h1>
        {apartment && (
          <ApartmentStatusBadge status={apartment.status} labels={t.status} />
        )}
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.info.building}</p>
          <p className="text-sm">{building?.name ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.info.bedBath}</p>
          <p className="text-sm">
            {apartment?.bedrooms} {t.info.bd} / {Number(apartment?.bathrooms)}{' '}
            {t.info.ba}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.info.sqft}</p>
          <p className="text-sm">{apartment?.sqft ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-3">
          <p className="text-xs text-muted-foreground">{t.info.notes}</p>
          <p className="text-sm whitespace-pre-wrap">
            {apartment?.notes ?? '—'}
          </p>
        </div>
      </div>

      {/* Leases section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t.lease.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite ? t.lease.subtitle : t.lease.subtitleReadOnly}
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
            {t.lease.newLease}
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.lease.table.renter}</TableHead>
              <TableHead>{t.lease.table.dates}</TableHead>
              <TableHead>{t.lease.table.rent}</TableHead>
              <TableHead>{t.lease.table.status}</TableHead>
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
                  {canWrite ? t.lease.emptyWrite : t.lease.empty}
                </TableCell>
              </TableRow>
            ) : (
              leases?.map((lease) => {
                const renter = renters?.find((r) => r.id === lease.renterId);
                return (
                  <TableRow key={lease.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/dashboard/renters/${lease.renterId}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {renter?.fullName ?? lease.renterId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lease.startDate).toLocaleDateString()} –{' '}
                      {new Date(lease.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lease.rentAmount}
                    </TableCell>
                    <TableCell>
                      <LeaseStatusBadge
                        status={lease.effectiveStatus}
                        labels={dict.leases.status}
                      />
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
                                  aria-label={t.lease.actionsLabel}
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
                                {t.lease.renewAction}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setTerminateTarget(lease)}
                              >
                                <XCircleIcon className="size-3.5 mr-1.5" />
                                {t.lease.terminateAction}
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
            <DialogTitle>{t.dialog.create.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-renter">
                {t.dialog.fields.renter}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="renterId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="l-renter" className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          !value
                            ? t.dialog.fields.selectRenter
                            : (renters?.find((r) => r.id === value)?.fullName ??
                              value)
                        }
                      </SelectValue>
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
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="recordExisting"
                  render={({ field }) => (
                    <Checkbox
                      id="l-record-existing"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                <Label htmlFor="l-record-existing" className="font-normal">
                  {t.dialog.fields.recordExisting}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.dialog.fields.recordExistingHelp}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="l-start">
                  {t.dialog.fields.startDate}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="l-start"
                  type="date"
                  min={recordExisting ? undefined : todayStr}
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
                  {t.dialog.fields.endDate}{' '}
                  <span className="text-destructive">*</span>
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
                  {t.dialog.fields.rentAmount}{' '}
                  <span className="text-destructive">*</span>
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
                  {t.dialog.fields.depositAmount}{' '}
                  <span className="text-destructive">*</span>
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
                {t.dialog.fields.renewalTerms}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.fields.optional}
                </span>
              </Label>
              <Textarea id="l-renewal" rows={2} {...register('renewalTerms')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-notes">
                {t.dialog.fields.notes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.fields.optional}
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
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.dialog.create.submitting : t.dialog.create.submit}
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
            <DialogTitle>{t.dialog.terminate.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.dialog.terminate.body}
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setTerminateTarget(null)}
            >
              {dict.common.cancel}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating}
            >
              {terminating
                ? t.dialog.terminate.submitting
                : t.dialog.terminate.submit}
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
            <DialogTitle>{t.dialog.renew.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleRenewSubmit(onRenewSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {t.dialog.renew.renewingFor}{' '}
              <span className="font-medium text-foreground">
                {renters?.find((r) => r.id === renewTarget?.renterId)
                  ?.fullName ?? renewTarget?.renterId}
              </span>{' '}
              — {t.header.unit} {apartment?.unitNumber}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rn-start">
                  {t.dialog.fields.startDate}{' '}
                  <span className="text-destructive">*</span>
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
                  {t.dialog.fields.endDate}{' '}
                  <span className="text-destructive">*</span>
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
                  {t.dialog.fields.rentAmount}{' '}
                  <span className="text-destructive">*</span>
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
                  {t.dialog.fields.depositAmount}{' '}
                  <span className="text-destructive">*</span>
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
                {t.dialog.fields.renewalTerms}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.fields.optional}
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
                {t.dialog.fields.notes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.fields.optional}
                </span>
              </Label>
              <Textarea id="rn-notes" rows={2} {...regRenew('notes')} />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setRenewTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={renewing}>
                {renewing ? t.dialog.renew.submitting : t.dialog.renew.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

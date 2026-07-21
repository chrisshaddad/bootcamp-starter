'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ScrollTextIcon, PlusIcon, EyeIcon, SearchIcon } from 'lucide-react';

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
  useListAllLeasesQuery,
  useCreateLeaseMutation,
} from '@/store/api/endpoints/leases.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import { useListFloorsQuery } from '@/store/api/endpoints/floors.api';
import { useListApartmentsQuery } from '@/store/api/endpoints/apartments.api';
import { useListRentersQuery } from '@/store/api/endpoints/renters.api';
import type { LeaseListRow, LeaseStatus } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Lease effective-status badge ────────────────────────────────────────────

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

// ── New lease form schema ────────────────────────────────────────────────────

const NONE = '__none__';
const ALL = '__all__';

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

function buildLeaseSchema(t: Dictionary['leases']['dialog']) {
  const numericField = () =>
    z
      .string()
      .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), {
        message: t.errors.invalidAmount,
      })
      .refine((v) => Number(v) >= 0, { message: t.errors.invalidAmount });

  return z
    .object({
      buildingId: z.string().min(1, t.errors.building),
      floorId: z.string().min(1, t.errors.floor),
      apartmentId: z.string().min(1, t.errors.apartment),
      renterId: z.string().min(1, t.errors.renter),
      startDate: z.string().min(1, t.errors.startDate),
      endDate: z.string().min(1, t.errors.endDate),
      rentAmount: numericField(),
      depositAmount: numericField(),
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

type NewLeaseFormValues = z.infer<ReturnType<typeof buildLeaseSchema>>;

const DEFAULT_VALUES: NewLeaseFormValues = {
  buildingId: '',
  floorId: '',
  apartmentId: '',
  renterId: '',
  startDate: '',
  endDate: '',
  rentAmount: '',
  depositAmount: '',
  renewalTerms: '',
  notes: '',
  recordExisting: false,
};

// ── New lease dialog ─────────────────────────────────────────────────────────

function NewLeaseDialog({
  open,
  onOpenChange,
  dict,
  initialRenterId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dict: Dictionary;
  /** Pre-selects (and locks) the renter, e.g. arriving from a renter's page. */
  initialRenterId?: string;
}) {
  const t = dict.leases.dialog;
  const { data: buildings } = useListBuildingsQuery();
  const { data: renters } = useListRentersQuery();
  const [createLease, { isLoading: creating }] = useCreateLeaseMutation();

  const schema = useMemo(() => buildLeaseSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewLeaseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULT_VALUES, renterId: initialRenterId ?? '' },
  });

  const buildingId = watch('buildingId');
  const floorId = watch('floorId');
  const recordExisting = watch('recordExisting');
  const todayStr = todayDateInputValue();

  const { data: floors } = useListFloorsQuery(buildingId, {
    skip: !buildingId,
  });
  const { data: apartments } = useListApartmentsQuery(
    { buildingId, floorId },
    { skip: !floorId },
  );

  function close() {
    onOpenChange(false);
    reset({ ...DEFAULT_VALUES, renterId: initialRenterId ?? '' });
  }

  async function onSubmit(values: NewLeaseFormValues) {
    try {
      await createLease({
        buildingId: values.buildingId,
        floorId: values.floorId,
        apartmentId: values.apartmentId,
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
      toast.success(t.success);
      close();
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? t.genericError);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t.building}</Label>
              <Controller
                control={control}
                name="buildingId"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? '' : (v ?? '');
                      field.onChange(next);
                      setValue('floorId', '');
                      setValue('apartmentId', '');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          !value || value === NONE
                            ? t.selectBuilding
                            : (buildings?.find((b) => b.id === value)?.name ??
                              value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t.selectBuilding}</SelectItem>
                      {buildings?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.buildingId && (
                <p className="text-xs text-destructive">
                  {errors.buildingId.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t.floor}</Label>
              <Controller
                control={control}
                name="floorId"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? '' : (v ?? '');
                      field.onChange(next);
                      setValue('apartmentId', '');
                    }}
                    disabled={!buildingId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          !value || value === NONE
                            ? t.selectFloor
                            : (floors?.find((f) => f.id === value)?.name ??
                              value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t.selectFloor}</SelectItem>
                      {floors?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.floorId && (
                <p className="text-xs text-destructive">
                  {errors.floorId.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t.apartment}</Label>
              <Controller
                control={control}
                name="apartmentId"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) =>
                      field.onChange(v === NONE ? '' : (v ?? ''))
                    }
                    disabled={!floorId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          !value || value === NONE
                            ? t.selectApartment
                            : (apartments?.find((a) => a.id === value)
                                ?.unitNumber ?? value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t.selectApartment}</SelectItem>
                      {apartments?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.unitNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.apartmentId && (
                <p className="text-xs text-destructive">
                  {errors.apartmentId.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              {t.renter} <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="renterId"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) =>
                    field.onChange(v === NONE ? '' : (v ?? ''))
                  }
                  disabled={!!initialRenterId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        !value || value === NONE
                          ? t.selectRenter
                          : (renters?.find((r) => r.id === value)?.fullName ??
                            value)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t.selectRenter}</SelectItem>
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
                    id="nl-record-existing"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                )}
              />
              <Label htmlFor="nl-record-existing" className="font-normal">
                {t.recordExisting}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.recordExistingHelp}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nl-start">
                {t.startDate} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nl-start"
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
              <Label htmlFor="nl-end">
                {t.endDate} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nl-end"
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
              <Label htmlFor="nl-rent">
                {t.rentAmount} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nl-rent"
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
              <Label htmlFor="nl-deposit">
                {t.depositAmount} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nl-deposit"
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
            <Label htmlFor="nl-renewal">
              {t.renewalTerms}{' '}
              <span className="text-muted-foreground font-normal">
                {t.optional}
              </span>
            </Label>
            <Textarea id="nl-renewal" rows={2} {...register('renewalTerms')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nl-notes">
              {t.notes}{' '}
              <span className="text-muted-foreground font-normal">
                {t.optional}
              </span>
            </Label>
            <Textarea id="nl-notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={close}
            >
              {t.cancel}
            </DialogClose>
            <Button type="submit" disabled={creating}>
              {creating ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface LeasesPageProps {
  locale: string;
  dict: Dictionary;
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
}

export function LeasesPage({ locale, dict, canWrite }: LeasesPageProps) {
  const t = dict.leases;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: leases, isLoading, isError } = useListAllLeasesQuery();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [buildingFilter, setBuildingFilter] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);

  // Deep-link entry from a renter's page: `?newLease=1&renterId=…` preselects
  // and locks the renter on the New Lease dialog, opened automatically once.
  const initialRenterId = searchParams.get('renterId') ?? undefined;
  useEffect(() => {
    if (canWrite && (searchParams.get('newLease') === '1' || initialRenterId)) {
      setCreateOpen(true);
    }
    // Only ever auto-open once, from the params present on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildingOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const lease of leases ?? []) {
      if (!map.has(lease.buildingId)) {
        map.set(lease.buildingId, lease.buildingName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [leases]);

  const filteredLeases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (leases ?? []).filter((lease) => {
      if (statusFilter !== ALL && lease.effectiveStatus !== statusFilter) {
        return false;
      }
      if (buildingFilter !== ALL && lease.buildingId !== buildingFilter) {
        return false;
      }
      if (q) {
        const haystack =
          `${lease.renterName} ${lease.unitNumber} ${lease.buildingName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leases, search, statusFilter, buildingFilter]);

  const hasAnyLeases = (leases?.length ?? 0) > 0;

  function goToLease(lease: LeaseListRow) {
    router.push(
      `/${locale}/dashboard/buildings/${lease.buildingId}/floors/${lease.floorId}/apartments/${lease.apartmentId}`,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              {t.readOnly}
            </Badge>
          )}
          {canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {t.newLease}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {hasAnyLeases && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leases-filter-search">{t.filters.searchLabel}</Label>
            <div className="relative">
              <SearchIcon className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="leases-filter-search"
                className="w-64 ps-8"
                placeholder={t.filters.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leases-filter-status">{t.filters.statusLabel}</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? ALL)}
            >
              <SelectTrigger id="leases-filter-status" className="w-40">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.filters.allStatuses
                      : (t.status[value as keyof typeof t.status] ?? value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.filters.allStatuses}</SelectItem>
                <SelectItem value="active">{t.status.active}</SelectItem>
                <SelectItem value="expired">{t.status.expired}</SelectItem>
                <SelectItem value="terminated">
                  {t.status.terminated}
                </SelectItem>
                <SelectItem value="draft">{t.status.draft}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leases-filter-building">
              {t.filters.buildingLabel}
            </Label>
            <Select
              value={buildingFilter}
              onValueChange={(val) => setBuildingFilter(val ?? ALL)}
            >
              <SelectTrigger id="leases-filter-building" className="w-44">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.filters.allBuildings
                      : (buildingOptions.find((b) => b.id === value)?.name ??
                        value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.filters.allBuildings}</SelectItem>
                {buildingOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Leases table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.table.unit}</TableHead>
              <TableHead>{t.table.renter}</TableHead>
              <TableHead>{t.table.dates}</TableHead>
              <TableHead>{t.table.rent}</TableHead>
              <TableHead>{t.table.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
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
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.loadError}
                </TableCell>
              </TableRow>
            ) : !hasAnyLeases ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ScrollTextIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite ? t.emptyWrite : t.empty}
                </TableCell>
              </TableRow>
            ) : filteredLeases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.noMatch}
                </TableCell>
              </TableRow>
            ) : (
              filteredLeases.map((lease) => (
                <TableRow
                  key={lease.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToLease(lease)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToLease(lease);
                    }
                  }}
                >
                  <TableCell>
                    <span className="font-medium text-sm">
                      {lease.unitNumber}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {lease.buildingName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lease.renterName}
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
                      labels={t.status}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canWrite && (
        <NewLeaseDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          dict={dict}
          initialRenterId={initialRenterId}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  MoreHorizontalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  WrenchIcon,
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  useListMaintenanceRequestsQuery,
  useCreateMaintenanceRequestMutation,
  useUpdateMaintenanceRequestMutation,
  useDeleteMaintenanceRequestMutation,
} from '@/store/api/endpoints/maintenance-requests.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import { useListFloorsQuery } from '@/store/api/endpoints/floors.api';
import { useListApartmentsQuery } from '@/store/api/endpoints/apartments.api';
import { useListRentersQuery } from '@/store/api/endpoints/renters.api';
import { useListAllLeasesQuery } from '@/store/api/endpoints/leases.api';
import type {
  MaintenanceRequestPriority,
  MaintenanceRequestResponse,
  MaintenanceRequestStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Status / priority badges ────────────────────────────────────────────────

const STATUSES: MaintenanceRequestStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

const STATUS_STYLES: Record<MaintenanceRequestStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground border-transparent',
};

function MaintenanceStatusBadge({
  status,
  labels,
}: {
  status: MaintenanceRequestStatus;
  labels: Dictionary['tasks']['status'];
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {labels[status] ?? status}
    </Badge>
  );
}

const PRIORITIES: MaintenanceRequestPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];

const PRIORITY_STYLES: Record<MaintenanceRequestPriority, string> = {
  low: 'bg-muted text-muted-foreground border-transparent',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

function MaintenancePriorityBadge({
  priority,
  labels,
}: {
  priority: MaintenanceRequestPriority;
  labels: Dictionary['tasks']['priority'];
}) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority]}>
      {labels[priority] ?? priority}
    </Badge>
  );
}

// ── Create form ──────────────────────────────────────────────────────────────

function buildCreateSchema(t: Dictionary['tasks']['dialog']['create']) {
  return z.object({
    buildingId: z.string().min(1, t.errors.building),
    floorId: z.string().min(1, t.errors.floor),
    apartmentId: z.string().min(1, t.errors.apartment),
    renterId: z.string().min(1, t.errors.renter),
    title: z.string().min(1, t.errors.title),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    notes: z.string().optional(),
  });
}

type CreateFormValues = z.infer<ReturnType<typeof buildCreateSchema>>;

const CREATE_EMPTY_VALUES: CreateFormValues = {
  buildingId: '',
  floorId: '',
  apartmentId: '',
  renterId: '',
  title: '',
  description: '',
  priority: 'medium',
  notes: '',
};

// ── Edit form ────────────────────────────────────────────────────────────────
// Apartment/renter/building are shown read-only for context rather than
// re-pickable — same "implicit from the existing record" simplification
// used by the Lease renewal dialog for renter/unit.

function buildEditSchema(t: Dictionary['tasks']['dialog']['edit']) {
  return z.object({
    title: z.string().min(1, t.errors.title),
    description: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    notes: z.string().optional(),
  });
}

type EditFormValues = z.infer<ReturnType<typeof buildEditSchema>>;

// ── Main component ────────────────────────────────────────────────────────────

const ALL = '__all__';

interface TasksPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
  locale: string;
  dict: Dictionary;
}

export function TasksPage({ canWrite, locale, dict }: TasksPageProps) {
  const t = dict.tasks;
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: requests,
    isLoading,
    isError,
  } = useListMaintenanceRequestsQuery();
  const { data: buildings } = useListBuildingsQuery();
  const { data: renters } = useListRentersQuery();

  // Dashboard KPI tiles deep-link here with `?status=` / `?priority=` to land
  // pre-filtered (e.g. a supervisor's "urgent" tile). Unknown/absent values
  // fall back to "all".
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const param = searchParams.get('status');
    return param && (STATUSES as string[]).includes(param) ? param : ALL;
  });
  const [priorityFilter, setPriorityFilter] = useState<string>(() => {
    const param = searchParams.get('priority');
    return param && (PRIORITIES as string[]).includes(param) ? param : ALL;
  });

  const [createMaintenanceRequest, { isLoading: creating }] =
    useCreateMaintenanceRequestMutation();
  const [updateMaintenanceRequest, { isLoading: updating }] =
    useUpdateMaintenanceRequestMutation();
  const [deleteMaintenanceRequest, { isLoading: deleting }] =
    useDeleteMaintenanceRequestMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] =
    useState<MaintenanceRequestResponse | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<MaintenanceRequestResponse | null>(null);

  const createSchema = useMemo(
    () => buildCreateSchema(t.dialog.create),
    [t.dialog.create],
  );

  const {
    control: createControl,
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setCreateValue,
    getValues: getCreateValues,
    formState: { errors: createErrors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: CREATE_EMPTY_VALUES,
  });

  const createBuildingId = watchCreate('buildingId');
  const createFloorId = watchCreate('floorId');
  const createApartmentId = watchCreate('apartmentId');
  const createRenterId = watchCreate('renterId');

  const { data: createFloors } = useListFloorsQuery(createBuildingId, {
    skip: !createBuildingId,
  });
  const { data: createApartments } = useListApartmentsQuery(
    { buildingId: createBuildingId, floorId: createFloorId },
    { skip: !createBuildingId || !createFloorId },
  );

  // A maintenance request belongs to a property; the renter is derived from it.
  // When the user picks an apartment that has an active lease, auto-fill the
  // renter from that lease so they don't have to hand-pick (and can't mismatch)
  // it. Apartments with no active lease fall back to manual selection.
  const { data: allLeases } = useListAllLeasesQuery();
  useEffect(() => {
    if (!createApartmentId) return;
    const activeLease = allLeases?.find(
      (l) =>
        l.apartmentId === createApartmentId && l.effectiveStatus === 'active',
    );
    // Guard against ping-ponging with the renter→apartment effect below: only
    // write when the value actually needs to change.
    if (
      activeLease &&
      getCreateValues('renterId') !== activeLease.renterId
    ) {
      setCreateValue('renterId', activeLease.renterId, {
        shouldValidate: true,
      });
    }
  }, [createApartmentId, allLeases, setCreateValue, getCreateValues]);

  // Reverse of the above: picking a renter with exactly one active lease
  // fills building → floor → apartment from that lease (building must be set
  // first since floor/apartment options are dependent queries). A renter with
  // zero or multiple active leases leaves the fields for manual selection.
  useEffect(() => {
    if (!createRenterId) return;
    const matches = allLeases?.filter(
      (l) => l.renterId === createRenterId && l.effectiveStatus === 'active',
    );
    if (!matches || matches.length !== 1) return;
    const [lease] = matches;
    if (getCreateValues('buildingId') !== lease.buildingId) {
      setCreateValue('buildingId', lease.buildingId, { shouldValidate: true });
    }
    if (getCreateValues('floorId') !== lease.floorId) {
      setCreateValue('floorId', lease.floorId, { shouldValidate: true });
    }
    if (getCreateValues('apartmentId') !== lease.apartmentId) {
      setCreateValue('apartmentId', lease.apartmentId, {
        shouldValidate: true,
      });
    }
  }, [createRenterId, allLeases, setCreateValue, getCreateValues]);

  const editSchema = useMemo(
    () => buildEditSchema(t.dialog.edit),
    [t.dialog.edit],
  );

  const {
    register: regEdit,
    control: editControl,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  async function onCreateSubmit(values: CreateFormValues) {
    try {
      await createMaintenanceRequest({
        buildingId: values.buildingId,
        apartmentId: values.apartmentId,
        renterId: values.renterId,
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success(t.dialog.create.success);
      setCreateOpen(false);
      resetCreate(CREATE_EMPTY_VALUES);
    } catch {
      toast.error(t.dialog.create.genericError);
    }
  }

  function openEdit(request: MaintenanceRequestResponse) {
    setEditTarget(request);
    resetEdit({
      title: request.title,
      description: request.description ?? '',
      status: request.status,
      priority: request.priority,
      notes: request.notes ?? '',
    });
  }

  async function onEditSubmit(values: EditFormValues) {
    if (!editTarget) return;
    try {
      await updateMaintenanceRequest({
        id: editTarget.id,
        body: {
          title: values.title,
          description: values.description || undefined,
          status: values.status,
          priority: values.priority,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success(t.dialog.edit.success);
      setEditTarget(null);
    } catch {
      toast.error(t.dialog.edit.error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMaintenanceRequest(deleteTarget.id).unwrap();
      toast.success(t.dialog.delete.success);
      setDeleteTarget(null);
    } catch {
      toast.error(t.dialog.delete.error);
    }
  }

  function goToRequest(requestId: string) {
    router.push(`/${locale}/dashboard/tasks/${requestId}`);
  }

  const hasAnyRequests = (requests?.length ?? 0) > 0;

  const filteredRequests = useMemo(() => {
    return (requests ?? []).filter((request) => {
      if (statusFilter !== ALL && request.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== ALL && request.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [requests, statusFilter, priorityFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.list.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite ? t.list.subtitle : t.list.subtitleReadonly}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              {t.list.readOnly}
            </Badge>
          )}
          {canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {t.list.newRequest}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {hasAnyRequests && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tasks-filter-status">{t.filters.statusLabel}</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? ALL)}
            >
              <SelectTrigger id="tasks-filter-status" className="w-40">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.filters.allStatuses
                      : (t.status[value as MaintenanceRequestStatus] ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.filters.allStatuses}</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t.status[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tasks-filter-priority">
              {t.filters.priorityLabel}
            </Label>
            <Select
              value={priorityFilter}
              onValueChange={(val) => setPriorityFilter(val ?? ALL)}
            >
              <SelectTrigger id="tasks-filter-priority" className="w-40">
                <SelectValue>
                  {(value: string | null) =>
                    !value || value === ALL
                      ? t.filters.allPriorities
                      : (t.priority[value as MaintenanceRequestPriority] ??
                        value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.filters.allPriorities}</SelectItem>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {t.priority[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Requests table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.list.table.title}</TableHead>
              <TableHead>{t.list.table.apartment}</TableHead>
              <TableHead>{t.list.table.renter}</TableHead>
              <TableHead>{t.list.table.status}</TableHead>
              <TableHead>{t.list.table.priority}</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.list.loadError}
                </TableCell>
              </TableRow>
            ) : !hasAnyRequests ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite ? t.empty.write : t.empty.default}
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.list.noMatch}
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToRequest(request.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToRequest(request.id);
                    }
                  }}
                >
                  <TableCell>
                    <span className="font-medium text-sm">{request.title}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {request.apartmentUnitNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {request.renterName}
                  </TableCell>
                  <TableCell>
                    <MaintenanceStatusBadge
                      status={request.status}
                      labels={t.status}
                    />
                  </TableCell>
                  <TableCell>
                    <MaintenancePriorityBadge
                      priority={request.priority}
                      labels={t.priority}
                    />
                  </TableCell>
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t.list.actionsLabel}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => goToRequest(request.id)}
                          >
                            <EyeIcon className="size-3.5 mr-1.5" />
                            {t.list.actions.view}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(request)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(request)}
                          >
                            <TrashIcon className="size-3.5 mr-1.5" />
                            {dict.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── New Request Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreate(CREATE_EMPTY_VALUES);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.create.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-building">
                {t.dialog.create.building}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={createControl}
                name="buildingId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setCreateValue('floorId', '');
                      setCreateValue('apartmentId', '');
                    }}
                  >
                    <SelectTrigger id="mr-building" className="w-full">
                      <SelectValue>
                        {(value) =>
                          !value
                            ? t.dialog.create.selectBuilding
                            : (buildings?.find((b) => b.id === value)?.name ??
                              value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {buildings?.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {createErrors.buildingId && (
                <p className="text-xs text-destructive">
                  {createErrors.buildingId.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-floor">
                {t.dialog.create.floor}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={createControl}
                name="floorId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setCreateValue('apartmentId', '');
                    }}
                    disabled={!createBuildingId}
                  >
                    <SelectTrigger id="mr-floor" className="w-full">
                      <SelectValue>
                        {(value) =>
                          !value
                            ? t.dialog.create.selectFloor
                            : (createFloors?.find((f) => f.id === value)
                                ?.name ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {createFloors?.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id}>
                          {floor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {createErrors.floorId && (
                <p className="text-xs text-destructive">
                  {createErrors.floorId.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-apartment">
                {t.dialog.create.apartment}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={createControl}
                name="apartmentId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!createFloorId}
                  >
                    <SelectTrigger id="mr-apartment" className="w-full">
                      <SelectValue>
                        {(value) =>
                          !value
                            ? t.dialog.create.selectApartment
                            : (createApartments?.find((a) => a.id === value)
                                ?.unitNumber ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {createApartments?.map((apartment) => (
                        <SelectItem key={apartment.id} value={apartment.id}>
                          {apartment.unitNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {createErrors.apartmentId && (
                <p className="text-xs text-destructive">
                  {createErrors.apartmentId.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-renter">
                {t.dialog.create.renter}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={createControl}
                name="renterId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="mr-renter" className="w-full">
                      <SelectValue>
                        {(value) =>
                          !value
                            ? t.dialog.create.selectRenter
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
              {createErrors.renterId && (
                <p className="text-xs text-destructive">
                  {createErrors.renterId.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-title">
                {t.dialog.create.titleField}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mr-title"
                placeholder={t.dialog.create.titlePlaceholder}
                aria-invalid={!!createErrors.title}
                {...regCreate('title')}
              />
              {createErrors.title && (
                <p className="text-xs text-destructive">
                  {createErrors.title.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-description">
                {t.dialog.create.description}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.create.optional}
                </span>
              </Label>
              <Textarea
                id="mr-description"
                placeholder={t.dialog.create.descriptionPlaceholder}
                rows={2}
                {...regCreate('description')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-priority">{t.dialog.create.priority}</Label>
              <Controller
                control={createControl}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="mr-priority" className="w-full">
                      <SelectValue>
                        {(value) =>
                          !value
                            ? t.dialog.create.selectPriority
                            : (t.priority[
                                value as MaintenanceRequestPriority
                              ] ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {t.priority[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-notes">
                {t.dialog.create.notes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.create.optional}
                </span>
              </Label>
              <Textarea
                id="mr-notes"
                placeholder={t.dialog.create.notesPlaceholder}
                rows={2}
                {...regCreate('notes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(CREATE_EMPTY_VALUES);
                }}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.dialog.create.creating : t.dialog.create.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Request Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.edit.title}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="text-sm text-muted-foreground -mt-2">
              {t.dialog.edit.context
                .replace('{apartment}', editTarget.apartmentUnitNumber)
                .replace('{renter}', editTarget.renterName)}
            </div>
          )}
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mre-title">
                {t.dialog.edit.titleField}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mre-title"
                aria-invalid={!!editErrors.title}
                {...regEdit('title')}
              />
              {editErrors.title && (
                <p className="text-xs text-destructive">
                  {editErrors.title.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mre-description">
                {t.dialog.edit.description}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.edit.optional}
                </span>
              </Label>
              <Textarea
                id="mre-description"
                rows={2}
                {...regEdit('description')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mre-status">{t.dialog.edit.status}</Label>
                <Controller
                  control={editControl}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="mre-status" className="w-full">
                        <SelectValue>
                          {(value) =>
                            !value
                              ? t.dialog.edit.selectStatus
                              : (t.status[value as MaintenanceRequestStatus] ??
                                value)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t.status[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mre-priority">{t.dialog.edit.priority}</Label>
                <Controller
                  control={editControl}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="mre-priority" className="w-full">
                        <SelectValue>
                          {(value) =>
                            !value
                              ? t.dialog.edit.selectPriority
                              : (t.priority[
                                  value as MaintenanceRequestPriority
                                ] ?? value)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {t.priority[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mre-notes">
                {t.dialog.edit.notes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.dialog.edit.optional}
                </span>
              </Label>
              <Textarea id="mre-notes" rows={2} {...regEdit('notes')} />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.dialog.edit.saving : dict.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t.dialog.delete.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.dialog.delete.confirmBefore}{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>
              {t.dialog.delete.confirmAfter}
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setDeleteTarget(null)}
            >
              {dict.common.cancel}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t.dialog.delete.deleting : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

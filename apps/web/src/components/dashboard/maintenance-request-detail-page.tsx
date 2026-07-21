'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  ClipboardListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  WrenchIcon,
} from 'lucide-react';

import { formatWorkOrderNumber } from '@repo/contracts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

import { useGetMaintenanceRequestQuery } from '@/store/api/endpoints/maintenance-requests.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import { useListVendorsQuery } from '@/store/api/endpoints/vendors.api';
import { useListUsersQuery } from '@/store/api/endpoints/users.api';
import {
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation,
} from '@/store/api/endpoints/work-orders.api';
import type {
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
  WorkOrderResponse,
  WorkOrderStatus,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Maintenance request status / priority badges (shared with tasks-page) ──

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

// ── Work order status badge ─────────────────────────────────────────────────

const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'canceled',
];

const WORK_ORDER_STATUS_STYLES: Record<WorkOrderStatus, string> = {
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  canceled: 'bg-muted text-muted-foreground border-transparent',
};

function WorkOrderStatusBadge({
  status,
  labels,
}: {
  status: WorkOrderStatus;
  labels: Dictionary['maintenance']['workOrderStatus'];
}) {
  return (
    <Badge variant="outline" className={WORK_ORDER_STATUS_STYLES[status]}>
      {labels[status] ?? status}
    </Badge>
  );
}

// ── New Work Order form (org_admin only) ────────────────────────────────────
// No zod .min() messages here (all fields optional/enum) — nothing to
// dictionary-drive in the schema itself; validation strings live in the
// manual vendor/staff checks in onCreateSubmit below.

const createWorkOrderSchema = z.object({
  assignmentMode: z.enum(['vendor', 'staff']),
  vendorId: z.string().optional(),
  assignedUserId: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled']),
  cost: z.string().optional(),
  resolutionNotes: z.string().optional(),
  // F3.2: opt-in tenant billing. Default false; amount required in
  // onCreateSubmit below (mirrors the vendor/staff manual checks) rather
  // than a zod .refine, since this schema has no dictionary-driven messages.
  chargeToTenant: z.boolean(),
  tenantChargeAmount: z.string().optional(),
});

type CreateWorkOrderFormValues = z.infer<typeof createWorkOrderSchema>;

const CREATE_WORK_ORDER_EMPTY: CreateWorkOrderFormValues = {
  assignmentMode: 'vendor',
  vendorId: '',
  assignedUserId: '',
  status: 'scheduled',
  cost: '',
  resolutionNotes: '',
  chargeToTenant: false,
  tenantChargeAmount: '',
};

// ── Edit Work Order form (org_admin only, full) ─────────────────────────────

const editWorkOrderSchema = z.object({
  assignmentMode: z.enum(['vendor', 'staff']),
  vendorId: z.string().optional(),
  assignedUserId: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled']),
  cost: z.string().optional(),
  resolutionNotes: z.string().optional(),
  chargeToTenant: z.boolean(),
  tenantChargeAmount: z.string().optional(),
});

type EditWorkOrderFormValues = z.infer<typeof editWorkOrderSchema>;

// ── Update-status form (maintenance-role, own-assigned work orders) ────────

const updateStatusSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled']),
  resolutionNotes: z.string().optional(),
});

type UpdateStatusFormValues = z.infer<typeof updateStatusSchema>;

// ── Main component ────────────────────────────────────────────────────────────

interface MaintenanceRequestDetailPageProps {
  id: string;
  locale: string;
  /** org_admin only: create/reassign/delete a Work Order. */
  canWrite: boolean;
  /**
   * maintenance-role only: may update status/resolutionNotes on a Work Order
   * assigned to them. The frontend cannot tell which rows are "theirs"
   * without a new identity endpoint (GET /users, used to resolve names, is
   * ORG_ADMIN/SUPERVISOR only) — the action is shown on every row and the
   * backend's per-row 403 + toast is the real enforcement.
   */
  isMaintenanceCaller: boolean;
  /**
   * The caller's Keycloak `sub`, used to highlight work orders assigned to
   * them. Decoded server-side from the session access token (the session
   * object itself does not expose `sub`/`id` for the JWT strategy) — undefined
   * falls back to no highlight rather than a wrong one.
   */
  callerSub?: string;
  dict: Dictionary;
}

export function MaintenanceRequestDetailPage({
  id,
  locale,
  canWrite,
  isMaintenanceCaller,
  callerSub,
  dict,
}: MaintenanceRequestDetailPageProps) {
  const t = dict.maintenance;
  const tt = dict.tasks;
  const {
    data: request,
    isLoading,
    isError,
  } = useGetMaintenanceRequestQuery(id);
  const { data: buildings } = useListBuildingsQuery();
  const { data: vendors } = useListVendorsQuery();
  const { data: users } = useListUsersQuery();

  const [createWorkOrder, { isLoading: creating }] =
    useCreateWorkOrderMutation();
  const [updateWorkOrder, { isLoading: updating }] =
    useUpdateWorkOrderMutation();
  const [deleteWorkOrder, { isLoading: deleting }] =
    useDeleteWorkOrderMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrderResponse | null>(null);
  const [statusTarget, setStatusTarget] = useState<WorkOrderResponse | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<WorkOrderResponse | null>(
    null,
  );

  const maintenanceStaff = (users ?? []).filter(
    (u) => u.role === 'maintenance',
  );

  const {
    control: createControl,
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    watch: watchCreate,
  } = useForm<CreateWorkOrderFormValues>({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: CREATE_WORK_ORDER_EMPTY,
  });
  const createMode = watchCreate('assignmentMode');
  const createChargeToTenant = watchCreate('chargeToTenant');

  const {
    control: editControl,
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    watch: watchEdit,
  } = useForm<EditWorkOrderFormValues>({
    resolver: zodResolver(editWorkOrderSchema),
  });
  const editMode = watchEdit('assignmentMode');
  const editChargeToTenant = watchEdit('chargeToTenant');

  const {
    control: statusControl,
    register: regStatus,
    handleSubmit: handleStatus,
    reset: resetStatus,
  } = useForm<UpdateStatusFormValues>({
    resolver: zodResolver(updateStatusSchema),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href={`/${locale}/dashboard/tasks`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeftIcon className="size-3.5" />
          {t.detail.backToTasks}
        </Link>
        <p className="text-sm text-muted-foreground">{t.detail.loadError}</p>
      </div>
    );
  }

  function assigneeLabel(workOrder: {
    vendorId?: string | null;
    assignedUserId?: string | null;
  }) {
    if (workOrder.vendorId) {
      return (
        vendors?.find((v) => v.id === workOrder.vendorId)?.companyName ??
        workOrder.vendorId
      );
    }
    if (workOrder.assignedUserId) {
      const member = users?.find((u) => u.userId === workOrder.assignedUserId);
      return (
        member?.user?.fullName ??
        member?.username ??
        member?.user?.email ??
        workOrder.assignedUserId
      );
    }
    return '—';
  }

  async function onCreateSubmit(values: CreateWorkOrderFormValues) {
    if (values.assignmentMode === 'vendor' && !values.vendorId) {
      toast.error(t.workOrder.create.vendorRequired);
      return;
    }
    if (values.assignmentMode === 'staff' && !values.assignedUserId) {
      toast.error(t.workOrder.create.staffRequired);
      return;
    }
    if (values.chargeToTenant && !values.tenantChargeAmount) {
      toast.error(t.workOrder.fields.tenantChargeAmountRequired);
      return;
    }
    try {
      await createWorkOrder({
        maintenanceRequestId: id,
        body: {
          vendorId:
            values.assignmentMode === 'vendor' ? values.vendorId : undefined,
          assignedUserId:
            values.assignmentMode === 'staff'
              ? values.assignedUserId
              : undefined,
          status: values.status,
          cost: values.cost ? Number(values.cost) : undefined,
          resolutionNotes: values.resolutionNotes || undefined,
          chargeToTenant: values.chargeToTenant,
          tenantChargeAmount:
            values.chargeToTenant && values.tenantChargeAmount
              ? Number(values.tenantChargeAmount)
              : undefined,
        },
      }).unwrap();
      toast.success(t.workOrder.create.success);
      setCreateOpen(false);
      resetCreate(CREATE_WORK_ORDER_EMPTY);
    } catch {
      toast.error(t.workOrder.create.genericError);
    }
  }

  function openEdit(workOrder: WorkOrderResponse) {
    setEditTarget(workOrder);
    resetEdit({
      assignmentMode: workOrder.vendorId ? 'vendor' : 'staff',
      vendorId: workOrder.vendorId ?? '',
      assignedUserId: workOrder.assignedUserId ?? '',
      status: workOrder.status,
      cost: workOrder.cost ?? '',
      resolutionNotes: workOrder.resolutionNotes ?? '',
      chargeToTenant: workOrder.chargeToTenant,
      tenantChargeAmount: workOrder.tenantChargeAmount ?? '',
    });
  }

  async function onEditSubmit(values: EditWorkOrderFormValues) {
    if (!editTarget) return;
    if (values.chargeToTenant && !values.tenantChargeAmount) {
      toast.error(t.workOrder.fields.tenantChargeAmountRequired);
      return;
    }
    try {
      await updateWorkOrder({
        maintenanceRequestId: id,
        workOrderId: editTarget.id,
        body: {
          vendorId:
            values.assignmentMode === 'vendor'
              ? (values.vendorId ?? null)
              : undefined,
          assignedUserId:
            values.assignmentMode === 'staff'
              ? (values.assignedUserId ?? null)
              : undefined,
          status: values.status,
          cost: values.cost ? Number(values.cost) : null,
          resolutionNotes: values.resolutionNotes || null,
          chargeToTenant: values.chargeToTenant,
          tenantChargeAmount:
            values.chargeToTenant && values.tenantChargeAmount
              ? Number(values.tenantChargeAmount)
              : null,
        },
      }).unwrap();
      toast.success(t.workOrder.edit.success);
      setEditTarget(null);
    } catch {
      toast.error(t.workOrder.edit.error);
    }
  }

  function openStatusUpdate(workOrder: WorkOrderResponse) {
    setStatusTarget(workOrder);
    resetStatus({
      status: workOrder.status,
      resolutionNotes: workOrder.resolutionNotes ?? '',
    });
  }

  async function onStatusSubmit(values: UpdateStatusFormValues) {
    if (!statusTarget) return;
    try {
      await updateWorkOrder({
        maintenanceRequestId: id,
        workOrderId: statusTarget.id,
        body: {
          status: values.status,
          resolutionNotes: values.resolutionNotes || null,
        },
      }).unwrap();
      toast.success(t.workOrder.updateStatus.success);
      setStatusTarget(null);
    } catch {
      toast.error(t.workOrder.updateStatus.error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteWorkOrder({
        maintenanceRequestId: id,
        workOrderId: deleteTarget.id,
      }).unwrap();
      toast.success(t.workOrder.delete.success);
      setDeleteTarget(null);
    } catch {
      toast.error(t.workOrder.delete.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/dashboard/tasks`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        {t.detail.backToTasks}
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardListIcon className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {request.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MaintenanceStatusBadge status={request.status} labels={tt.status} />
          <MaintenancePriorityBadge
            priority={request.priority}
            labels={tt.priority}
          />
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-muted-foreground">
            {t.detail.info.building}
          </p>
          <p className="text-sm font-medium">
            <Link
              href={`/${locale}/dashboard/buildings/${request.buildingId}`}
              className="hover:underline"
            >
              {buildings?.find((b) => b.id === request.buildingId)?.name ??
                request.buildingId}
            </Link>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t.detail.info.apartment}
          </p>
          <p className="text-sm font-medium">{request.apartmentUnitNumber}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t.detail.info.renter}
          </p>
          <p className="text-sm font-medium">
            <Link
              href={`/${locale}/dashboard/renters/${request.renterId}`}
              className="hover:underline"
            >
              {request.renterName}
            </Link>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t.detail.info.description}
          </p>
          <p className="text-sm font-medium">{request.description || '—'}</p>
        </div>
        {request.notes && (
          <div className="sm:col-span-3">
            <p className="text-xs text-muted-foreground">
              {t.detail.info.notes}
            </p>
            <p className="text-sm font-medium">{request.notes}</p>
          </div>
        )}
      </div>

      {/* Work order history */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t.detail.workOrdersTitle}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.detail.workOrdersSubtitle}
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            {t.detail.newWorkOrder}
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.detail.table.number}</TableHead>
              <TableHead>{t.detail.table.status}</TableHead>
              <TableHead>{t.detail.table.assignee}</TableHead>
              <TableHead>{t.detail.table.cost}</TableHead>
              <TableHead>{t.detail.table.resolutionNotes}</TableHead>
              <TableHead>{t.detail.table.completed}</TableHead>
              {(canWrite || isMaintenanceCaller) && (
                <TableHead className="w-10" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.workOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite || isMaintenanceCaller ? 7 : 6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {t.detail.empty}
                </TableCell>
              </TableRow>
            ) : (
              request.workOrders.map((workOrder) => {
                const assignedToCaller =
                  Boolean(callerSub) &&
                  Boolean(workOrder.assignedUserId) &&
                  workOrder.assignedUserId === callerSub;
                return (
                  <TableRow
                    key={workOrder.id}
                    className={assignedToCaller ? 'bg-primary/5' : undefined}
                  >
                    <TableCell className="text-sm font-medium">
                      {workOrder.numberLabel ??
                        formatWorkOrderNumber(workOrder.number)}
                    </TableCell>
                    <TableCell>
                      <WorkOrderStatusBadge
                        status={workOrder.status}
                        labels={t.workOrderStatus}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {assigneeLabel(workOrder)}
                        {assignedToCaller && (
                          <Badge
                            variant="outline"
                            className="bg-primary/10 text-primary border-primary/20"
                          >
                            {t.detail.assignedToYou}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {workOrder.cost ?? '—'}
                        {workOrder.chargeToTenant && (
                          <Badge
                            variant="outline"
                            className={
                              workOrder.tenantChargedAt
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }
                          >
                            {workOrder.tenantChargedAt
                              ? t.detail.tenantChargeBilled
                              : t.detail.tenantChargePending}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {workOrder.resolutionNotes ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {workOrder.completedAt
                        ? new Date(workOrder.completedAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    {(canWrite || isMaintenanceCaller) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t.detail.actionsLabel}
                              >
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            {canWrite && (
                              <DropdownMenuItem
                                onClick={() => openEdit(workOrder)}
                              >
                                <PencilIcon className="size-3.5 mr-1.5" />
                                {dict.common.edit}
                              </DropdownMenuItem>
                            )}
                            {isMaintenanceCaller && !canWrite && (
                              <DropdownMenuItem
                                onClick={() => openStatusUpdate(workOrder)}
                              >
                                <PencilIcon className="size-3.5 mr-1.5" />
                                {t.detail.updateStatusAction}
                              </DropdownMenuItem>
                            )}
                            {canWrite && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(workOrder)}
                                >
                                  <TrashIcon className="size-3.5 mr-1.5" />
                                  {dict.common.delete}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── New Work Order Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreate(CREATE_WORK_ORDER_EMPTY);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.workOrder.create.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wo-mode">{t.workOrder.fields.assignTo}</Label>
              <Controller
                control={createControl}
                name="assignmentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="wo-mode" className="w-full">
                      <SelectValue>
                        {(value) =>
                          t.assignmentMode[value as 'vendor' | 'staff'] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">
                        {t.assignmentMode.vendor}
                      </SelectItem>
                      <SelectItem value="staff">
                        {t.assignmentMode.staff}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {createMode === 'vendor' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wo-vendor">
                  {t.assignmentMode.vendor}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={createControl}
                  name="vendorId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="wo-vendor" className="w-full">
                        <SelectValue>
                          {(value) =>
                            !value
                              ? t.workOrder.fields.selectVendor
                              : (vendors?.find((v) => v.id === value)
                                  ?.companyName ?? value)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wo-assignee">
                  {t.assignmentMode.staff}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={createControl}
                  name="assignedUserId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="wo-assignee" className="w-full">
                        <SelectValue>
                          {(value) => {
                            if (!value) {
                              return t.workOrder.fields.selectStaffMember;
                            }
                            const member = maintenanceStaff.find(
                              (m) => m.userId === value,
                            );
                            return (
                              member?.user?.fullName ??
                              member?.username ??
                              value
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {maintenanceStaff.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.user?.fullName ??
                              member.username ??
                              member.userId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wo-status">{t.workOrder.fields.status}</Label>
              <Controller
                control={createControl}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="wo-status" className="w-full">
                      <SelectValue>
                        {(value) =>
                          t.workOrderStatus[value as WorkOrderStatus] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t.workOrderStatus[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wo-cost">
                {t.workOrder.fields.cost}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.workOrder.fields.optional}
                </span>
              </Label>
              <Input
                id="wo-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...regCreate('cost')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Controller
                  control={createControl}
                  name="chargeToTenant"
                  render={({ field }) => (
                    <Checkbox
                      id="wo-charge-to-tenant"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                <Label htmlFor="wo-charge-to-tenant" className="font-normal">
                  {t.workOrder.fields.chargeToTenant}
                </Label>
              </div>
              {createChargeToTenant && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wo-tenant-charge-amount">
                    {t.workOrder.fields.tenantChargeAmount}
                  </Label>
                  <Input
                    id="wo-tenant-charge-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...regCreate('tenantChargeAmount')}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wo-notes">
                {t.workOrder.fields.resolutionNotes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.workOrder.fields.optional}
                </span>
              </Label>
              <Textarea
                id="wo-notes"
                rows={2}
                {...regCreate('resolutionNotes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(CREATE_WORK_ORDER_EMPTY);
                }}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating
                  ? t.workOrder.create.creating
                  : t.workOrder.create.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Work Order Dialog (org_admin) ─────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.workOrder.edit.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="woe-mode">{t.workOrder.fields.assignTo}</Label>
              <Controller
                control={editControl}
                name="assignmentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="woe-mode" className="w-full">
                      <SelectValue>
                        {(value) =>
                          t.assignmentMode[value as 'vendor' | 'staff'] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">
                        {t.assignmentMode.vendor}
                      </SelectItem>
                      <SelectItem value="staff">
                        {t.assignmentMode.staff}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {editMode === 'vendor' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="woe-vendor">{t.assignmentMode.vendor}</Label>
                <Controller
                  control={editControl}
                  name="vendorId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="woe-vendor" className="w-full">
                        <SelectValue>
                          {(value) =>
                            !value
                              ? t.workOrder.fields.selectVendor
                              : (vendors?.find((v) => v.id === value)
                                  ?.companyName ?? value)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="woe-assignee">{t.assignmentMode.staff}</Label>
                <Controller
                  control={editControl}
                  name="assignedUserId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="woe-assignee" className="w-full">
                        <SelectValue>
                          {(value) => {
                            if (!value) {
                              return t.workOrder.fields.selectStaffMember;
                            }
                            const member = maintenanceStaff.find(
                              (m) => m.userId === value,
                            );
                            return (
                              member?.user?.fullName ??
                              member?.username ??
                              value
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {maintenanceStaff.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.user?.fullName ??
                              member.username ??
                              member.userId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="woe-status">{t.workOrder.fields.status}</Label>
              <Controller
                control={editControl}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="woe-status" className="w-full">
                      <SelectValue>
                        {(value) =>
                          t.workOrderStatus[value as WorkOrderStatus] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t.workOrderStatus[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="woe-cost">
                {t.workOrder.fields.cost}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.workOrder.fields.optional}
                </span>
              </Label>
              <Input
                id="woe-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...regEdit('cost')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Controller
                  control={editControl}
                  name="chargeToTenant"
                  render={({ field }) => (
                    <Checkbox
                      id="woe-charge-to-tenant"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                <Label htmlFor="woe-charge-to-tenant" className="font-normal">
                  {t.workOrder.fields.chargeToTenant}
                </Label>
              </div>
              {editChargeToTenant && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="woe-tenant-charge-amount">
                    {t.workOrder.fields.tenantChargeAmount}
                  </Label>
                  <Input
                    id="woe-tenant-charge-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...regEdit('tenantChargeAmount')}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="woe-notes">
                {t.workOrder.fields.resolutionNotes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.workOrder.fields.optional}
                </span>
              </Label>
              <Textarea
                id="woe-notes"
                rows={2}
                {...regEdit('resolutionNotes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.workOrder.edit.saving : dict.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Update Status Dialog (maintenance, own-assigned) ───────────────── */}
      <Dialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t.workOrder.updateStatus.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleStatus(onStatusSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wos-status">{t.workOrder.fields.status}</Label>
              <Controller
                control={statusControl}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="wos-status" className="w-full">
                      <SelectValue>
                        {(value) =>
                          t.workOrderStatus[value as WorkOrderStatus] ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t.workOrderStatus[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wos-notes">
                {t.workOrder.fields.resolutionNotes}{' '}
                <span className="text-muted-foreground font-normal">
                  {t.workOrder.fields.optional}
                </span>
              </Label>
              <Textarea
                id="wos-notes"
                rows={2}
                {...regStatus('resolutionNotes')}
              />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setStatusTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.workOrder.updateStatus.saving : dict.common.save}
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
            <DialogTitle>{t.workOrder.delete.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.workOrder.delete.confirm}
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
              {deleting ? t.workOrder.delete.deleting : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

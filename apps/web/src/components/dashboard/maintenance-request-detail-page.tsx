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

import { useGetMaintenanceRequestQuery } from '@/store/api/endpoints/maintenance-requests.api';
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

// ── Maintenance request status / priority badges ────────────────────────────

const STATUS_LABELS: Record<MaintenanceRequestStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_STYLES: Record<MaintenanceRequestStatus, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground border-transparent',
};

function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceRequestStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

const PRIORITY_LABELS: Record<MaintenanceRequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const PRIORITY_STYLES: Record<MaintenanceRequestPriority, string> = {
  low: 'bg-muted text-muted-foreground border-transparent',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

function MaintenancePriorityBadge({
  priority,
}: {
  priority: MaintenanceRequestPriority;
}) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority]}>
      {PRIORITY_LABELS[priority] ?? priority}
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

const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  canceled: 'Canceled',
};

const WORK_ORDER_STATUS_STYLES: Record<WorkOrderStatus, string> = {
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  canceled: 'bg-muted text-muted-foreground border-transparent',
};

function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <Badge variant="outline" className={WORK_ORDER_STATUS_STYLES[status]}>
      {WORK_ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── New Work Order form (org_admin only) ────────────────────────────────────

const createWorkOrderSchema = z.object({
  assignmentMode: z.enum(['vendor', 'staff']),
  vendorId: z.string().optional(),
  assignedUserId: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled']),
  cost: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

type CreateWorkOrderFormValues = z.infer<typeof createWorkOrderSchema>;

const CREATE_WORK_ORDER_EMPTY: CreateWorkOrderFormValues = {
  assignmentMode: 'vendor',
  vendorId: '',
  assignedUserId: '',
  status: 'scheduled',
  cost: '',
  resolutionNotes: '',
};

// ── Edit Work Order form (org_admin only, full) ─────────────────────────────

const editWorkOrderSchema = z.object({
  assignmentMode: z.enum(['vendor', 'staff']),
  vendorId: z.string().optional(),
  assignedUserId: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled']),
  cost: z.string().optional(),
  resolutionNotes: z.string().optional(),
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
}

export function MaintenanceRequestDetailPage({
  id,
  locale,
  canWrite,
  isMaintenanceCaller,
}: MaintenanceRequestDetailPageProps) {
  const {
    data: request,
    isLoading,
    isError,
  } = useGetMaintenanceRequestQuery(id);
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
          Back to tasks
        </Link>
        <p className="text-sm text-muted-foreground">
          Failed to load this maintenance request.
        </p>
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
      toast.error('Select a vendor.');
      return;
    }
    if (values.assignmentMode === 'staff' && !values.assignedUserId) {
      toast.error('Select a staff member.');
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
        },
      }).unwrap();
      toast.success('Work order created.');
      setCreateOpen(false);
      resetCreate(CREATE_WORK_ORDER_EMPTY);
    } catch {
      toast.error('Failed to create work order. Please try again.');
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
    });
  }

  async function onEditSubmit(values: EditWorkOrderFormValues) {
    if (!editTarget) return;
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
        },
      }).unwrap();
      toast.success('Work order updated.');
      setEditTarget(null);
    } catch {
      toast.error('Failed to update work order.');
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
      toast.success('Work order updated.');
      setStatusTarget(null);
    } catch {
      toast.error(
        'Failed to update work order. You can only update a work order assigned to you.',
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteWorkOrder({
        maintenanceRequestId: id,
        workOrderId: deleteTarget.id,
      }).unwrap();
      toast.success('Work order deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete work order.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/dashboard/tasks`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to tasks
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardListIcon className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {request.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MaintenanceStatusBadge status={request.status} />
          <MaintenancePriorityBadge priority={request.priority} />
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Apartment</p>
          <p className="text-sm font-medium">{request.apartmentUnitNumber}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Renter</p>
          <p className="text-sm font-medium">{request.renterName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Description</p>
          <p className="text-sm font-medium">{request.description || '—'}</p>
        </div>
        {request.notes && (
          <div className="sm:col-span-3">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm font-medium">{request.notes}</p>
          </div>
        )}
      </div>

      {/* Work order history */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Work orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Job history for this maintenance request.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            New work order
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Vendor / Assignee</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Resolution notes</TableHead>
              <TableHead>Completed</TableHead>
              {(canWrite || isMaintenanceCaller) && (
                <TableHead className="w-10" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.workOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite || isMaintenanceCaller ? 6 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No work orders yet.
                </TableCell>
              </TableRow>
            ) : (
              request.workOrders.map((workOrder) => (
                <TableRow key={workOrder.id}>
                  <TableCell>
                    <WorkOrderStatusBadge status={workOrder.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {assigneeLabel(workOrder)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {workOrder.cost ?? '—'}
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
                              aria-label="Work order actions"
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
                              Edit
                            </DropdownMenuItem>
                          )}
                          {isMaintenanceCaller && !canWrite && (
                            <DropdownMenuItem
                              onClick={() => openStatusUpdate(workOrder)}
                            >
                              <PencilIcon className="size-3.5 mr-1.5" />
                              Update status
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
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
            <DialogTitle>New work order</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wo-mode">Assign to</Label>
              <Controller
                control={createControl}
                name="assignmentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="wo-mode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="staff">Staff member</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {createMode === 'vendor' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wo-vendor">
                  Vendor <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={createControl}
                  name="vendorId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="wo-vendor" className="w-full">
                        <SelectValue placeholder="Select a vendor" />
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
                  Staff member <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={createControl}
                  name="assignedUserId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="wo-assignee" className="w-full">
                        <SelectValue placeholder="Select a staff member" />
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
              <Label htmlFor="wo-status">Status</Label>
              <Controller
                control={createControl}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="wo-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {WORK_ORDER_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wo-cost">
                Cost{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wo-notes">
                Resolution notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
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
                Cancel
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
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
            <DialogTitle>Edit work order</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="woe-mode">Assign to</Label>
              <Controller
                control={editControl}
                name="assignmentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="woe-mode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="staff">Staff member</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {editMode === 'vendor' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="woe-vendor">Vendor</Label>
                <Controller
                  control={editControl}
                  name="vendorId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="woe-vendor" className="w-full">
                        <SelectValue placeholder="Select a vendor" />
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
                <Label htmlFor="woe-assignee">Staff member</Label>
                <Controller
                  control={editControl}
                  name="assignedUserId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="woe-assignee" className="w-full">
                        <SelectValue placeholder="Select a staff member" />
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
              <Label htmlFor="woe-status">Status</Label>
              <Controller
                control={editControl}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="woe-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {WORK_ORDER_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="woe-cost">
                Cost{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="woe-notes">
                Resolution notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
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
                Cancel
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? 'Saving…' : 'Save'}
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
            <DialogTitle>Update work order</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleStatus(onStatusSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wos-status">Status</Label>
              <Controller
                control={statusControl}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="wos-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {WORK_ORDER_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wos-notes">
                Resolution notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
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
                Cancel
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? 'Saving…' : 'Save'}
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
            <DialogTitle>Delete work order</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this work order? This action
              cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

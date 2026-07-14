'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type {
  MaintenanceRequestPriority,
  MaintenanceRequestResponse,
  MaintenanceRequestStatus,
} from '@/types/api';

// ── Status / priority badges ────────────────────────────────────────────────

const STATUSES: MaintenanceRequestStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

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

const PRIORITIES: MaintenanceRequestPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];

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

// ── Create form ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  buildingId: z.string().min(1, 'Building is required'),
  floorId: z.string().min(1, 'Floor is required'),
  apartmentId: z.string().min(1, 'Apartment is required'),
  renterId: z.string().min(1, 'Renter is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

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

const editSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

// ── Main component ────────────────────────────────────────────────────────────

interface TasksPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
  locale: string;
}

export function TasksPage({ canWrite, locale }: TasksPageProps) {
  const router = useRouter();
  const {
    data: requests,
    isLoading,
    isError,
  } = useListMaintenanceRequestsQuery();
  const { data: buildings } = useListBuildingsQuery();
  const { data: renters } = useListRentersQuery();

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

  const {
    control: createControl,
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: CREATE_EMPTY_VALUES,
  });

  const createBuildingId = watchCreate('buildingId');
  const createFloorId = watchCreate('floorId');

  const { data: createFloors } = useListFloorsQuery(createBuildingId, {
    skip: !createBuildingId,
  });
  const { data: createApartments } = useListApartmentsQuery(
    { buildingId: createBuildingId, floorId: createFloorId },
    { skip: !createBuildingId || !createFloorId },
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
      toast.success('Maintenance request created.');
      setCreateOpen(false);
      resetCreate(CREATE_EMPTY_VALUES);
    } catch {
      toast.error('Failed to create maintenance request. Please try again.');
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
      toast.success('Maintenance request updated.');
      setEditTarget(null);
    } catch {
      toast.error('Failed to update maintenance request.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMaintenanceRequest(deleteTarget.id).unwrap();
      toast.success('Maintenance request deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete maintenance request.');
    }
  }

  function goToRequest(requestId: string) {
    router.push(`/${locale}/dashboard/tasks/${requestId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? 'Maintenance requests for your assigned buildings.'
              : 'Maintenance requests for your assigned buildings, read-only.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              Read-only
            </Badge>
          )}
          {canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              New request
            </Button>
          )}
        </div>
      </div>

      {/* Requests table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Apartment</TableHead>
              <TableHead>Renter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
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
                  Failed to load maintenance requests. Please try again.
                </TableCell>
              </TableRow>
            ) : requests?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
                  className="text-center py-10 text-muted-foreground"
                >
                  <WrenchIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite
                    ? 'No maintenance requests yet. Log your first request.'
                    : 'No maintenance requests yet.'}
                </TableCell>
              </TableRow>
            ) : (
              requests?.map((request) => (
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
                    <MaintenanceStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    <MaintenancePriorityBadge priority={request.priority} />
                  </TableCell>
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Maintenance request actions"
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
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(request)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(request)}
                          >
                            <TrashIcon className="size-3.5 mr-1.5" />
                            Delete
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
            <DialogTitle>New maintenance request</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-building">
                Building <span className="text-destructive">*</span>
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
                      <SelectValue placeholder="Select a building" />
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
                Floor <span className="text-destructive">*</span>
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
                      <SelectValue placeholder="Select a floor" />
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
                Apartment <span className="text-destructive">*</span>
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
                      <SelectValue placeholder="Select an apartment" />
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
                Renter <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={createControl}
                name="renterId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="mr-renter" className="w-full">
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
              {createErrors.renterId && (
                <p className="text-xs text-destructive">
                  {createErrors.renterId.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mr-title"
                placeholder="Leaky faucet in kitchen"
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
                Description{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="mr-description"
                placeholder="Describe the issue…"
                rows={2}
                {...regCreate('description')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-priority">Priority</Label>
              <Controller
                control={createControl}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="mr-priority" className="w-full">
                      <SelectValue placeholder="Select a priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mr-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="mr-notes"
                placeholder="Any notes…"
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
                Cancel
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
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
            <DialogTitle>Edit maintenance request</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="text-sm text-muted-foreground -mt-2">
              Apartment {editTarget.apartmentUnitNumber} ·{' '}
              {editTarget.renterName}
            </div>
          )}
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mre-title">
                Title <span className="text-destructive">*</span>
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
                Description{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
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
                <Label htmlFor="mre-status">Status</Label>
                <Controller
                  control={editControl}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="mre-status" className="w-full">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mre-priority">Priority</Label>
                <Controller
                  control={editControl}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="mre-priority" className="w-full">
                        <SelectValue placeholder="Select a priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {PRIORITY_LABELS[priority]}
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
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea id="mre-notes" rows={2} {...regEdit('notes')} />
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

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete maintenance request</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>
              ? This action cannot be undone.
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

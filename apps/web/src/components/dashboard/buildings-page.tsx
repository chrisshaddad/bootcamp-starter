'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  MoreHorizontalIcon,
  Building2Icon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  useListBuildingsQuery,
  useCreateBuildingMutation,
  useUpdateBuildingMutation,
  useDeleteBuildingMutation,
  useSetBuildingAssignmentsMutation,
} from '@/store/api/endpoints/buildings.api';
import { useListUsersQuery } from '@/store/api/endpoints/users.api';
import type { BuildingResponse, AssignableRole } from '@/types/api';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const buildingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  code: z.string().optional(),
  notes: z.string().optional(),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Roles that can be assigned to buildings */
const ASSIGNABLE: AssignableRole[] = ['supervisor', 'maintenance'];

// ── Main component ────────────────────────────────────────────────────────────

interface BuildingsPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
}

export function BuildingsPage({ canWrite }: BuildingsPageProps) {
  const { data: buildings, isLoading } = useListBuildingsQuery();
  const { data: allUsers } = useListUsersQuery();
  const [createBuilding, { isLoading: creating }] = useCreateBuildingMutation();
  const [updateBuilding, { isLoading: updating }] = useUpdateBuildingMutation();
  const [deleteBuilding, { isLoading: deleting }] = useDeleteBuildingMutation();
  const [setAssignments, { isLoading: assigning }] =
    useSetBuildingAssignmentsMutation();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BuildingResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BuildingResponse | null>(
    null,
  );
  const [assignTarget, setAssignTarget] = useState<BuildingResponse | null>(
    null,
  );
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  // ── Create form ────────────────────────────────────────────────────────────

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
  });

  async function onCreateSubmit(values: BuildingFormValues) {
    try {
      await createBuilding({
        name: values.name,
        address: values.address || undefined,
        code: values.code || undefined,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success('Building created.');
      setCreateOpen(false);
      resetCreate();
    } catch (err: unknown) {
      const apiErr = err as { data?: { code?: string } };
      if (apiErr?.data?.code === 'BUILDINGS_LIMIT_REACHED') {
        toast.error(
          'Building limit reached for your plan. Upgrade to add more.',
        );
      } else {
        toast.error('Failed to create building. Please try again.');
      }
    }
  }

  function openEdit(building: BuildingResponse) {
    setEditTarget(building);
    resetEdit({
      name: building.name,
      address: building.address ?? '',
      code: building.code ?? '',
      notes: building.notes ?? '',
    });
  }

  async function onEditSubmit(values: BuildingFormValues) {
    if (!editTarget) return;
    try {
      await updateBuilding({
        id: editTarget.id,
        body: {
          name: values.name,
          address: values.address || undefined,
          code: values.code || undefined,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success('Building updated.');
      setEditTarget(null);
    } catch {
      toast.error('Failed to update building.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBuilding(deleteTarget.id).unwrap();
      toast.success('Building deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete building.');
    }
  }

  // ── Assignments ────────────────────────────────────────────────────────────

  function openAssign(building: BuildingResponse) {
    setAssignTarget(building);
    setAssignedUserIds(building.assignedUserIds ?? []);
  }

  function toggleUserId(id: string, checked: boolean) {
    setAssignedUserIds((prev) =>
      checked ? [...prev, id] : prev.filter((u) => u !== id),
    );
  }

  async function handleSaveAssignments() {
    if (!assignTarget) return;
    try {
      await setAssignments({
        id: assignTarget.id,
        body: { userIds: assignedUserIds },
      }).unwrap();
      toast.success('Staff assignments updated.');
      setAssignTarget(null);
    } catch {
      toast.error('Failed to update assignments.');
    }
  }

  // Staff users that can be assigned (supervisor / maintenance)
  const assignableUsers = (allUsers ?? []).filter((m) =>
    (ASSIGNABLE as string[]).includes(m.role),
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Buildings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? "Create and manage your organization's buildings."
              : 'Buildings in your organization.'}
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
              Add building
            </Button>
          )}
        </div>
      </div>

      {/* Buildings table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Building</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Assigned staff</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : buildings?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <Building2Icon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite
                    ? 'No buildings yet. Create your first building.'
                    : 'No buildings are assigned to you yet.'}
                </TableCell>
              </TableRow>
            ) : (
              buildings?.map((building) => (
                <TableRow key={building.id}>
                  <TableCell>
                    <span className="font-medium text-sm">{building.name}</span>
                  </TableCell>
                  <TableCell>
                    {building.code ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {building.code}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {building.address ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UsersIcon className="size-3 shrink-0" />
                      {(building.assignedUserIds ?? []).length}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Building actions"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(building)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAssign(building)}
                          >
                            <UsersIcon className="size-3.5 mr-1.5" />
                            Assign staff
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(building)}
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

      {/* ── Create Building Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add building</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="b-name"
                placeholder="Main Tower"
                aria-invalid={!!createErrors.name}
                {...regCreate('name')}
              />
              {createErrors.name && (
                <p className="text-xs text-destructive">
                  {createErrors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-code">
                Code{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input id="b-code" placeholder="BLD-01" {...regCreate('code')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-address">
                Address{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="b-address"
                placeholder="123 Main St, Dubai"
                {...regCreate('address')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="b-notes"
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
                  resetCreate();
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

      {/* ── Edit Building Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit building</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="be-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="be-name"
                aria-invalid={!!editErrors.name}
                {...regEdit('name')}
              />
              {editErrors.name && (
                <p className="text-xs text-destructive">
                  {editErrors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="be-code">Code</Label>
              <Input id="be-code" {...regEdit('code')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="be-address">Address</Label>
              <Input id="be-address" {...regEdit('address')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="be-notes">Notes</Label>
              <Textarea id="be-notes" rows={2} {...regEdit('notes')} />
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
            <DialogTitle>Delete building</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
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

      {/* ── Assign Staff Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign staff to {assignTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <p className="text-sm text-muted-foreground">
              Select supervisors and maintenance staff to assign to this
              building.
            </p>
            {assignableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No supervisor or maintenance staff found. Create staff members
                first.
              </p>
            ) : (
              <div className="rounded-md border bg-muted/30 divide-y max-h-56 overflow-y-auto">
                {assignableUsers.map((member) => {
                  const name =
                    member.user?.fullName ??
                    member.username ??
                    member.user?.email ??
                    member.id;
                  return (
                    <label
                      key={member.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={assignedUserIds.includes(member.userId)}
                        onChange={(e) =>
                          toggleUserId(member.userId, e.target.checked)
                        }
                      />
                      <span className="flex-1 truncate">{name}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {member.role}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setAssignTarget(null)}
            >
              Cancel
            </DialogClose>
            <Button onClick={handleSaveAssignments} disabled={assigning}>
              {assigning ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2Icon,
  Layers2Icon,
  PlusIcon,
  MoreHorizontalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
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

import { useGetBuildingQuery } from '@/store/api/endpoints/buildings.api';
import {
  useListFloorsQuery,
  useCreateFloorMutation,
  useUpdateFloorMutation,
  useDeleteFloorMutation,
} from '@/store/api/endpoints/floors.api';
import type { FloorResponse } from '@/types/api';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const createFloorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  notes: z.string().optional(),
});
type CreateFloorFormValues = z.infer<typeof createFloorSchema>;

const editFloorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  order: z
    .string()
    .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), {
      message: 'Order must be a number',
    })
    .refine((v) => Number.isInteger(Number(v)), {
      message: 'Order must be a whole number',
    })
    .refine((v) => Number(v) >= 0, { message: 'Order cannot be negative' }),
  notes: z.string().optional(),
});
type EditFloorFormValues = z.infer<typeof editFloorSchema>;

// ── Main component ────────────────────────────────────────────────────────────

interface BuildingDetailPageProps {
  buildingId: string;
  canWrite: boolean;
  locale: string;
}

export function BuildingDetailPage({
  buildingId,
  canWrite,
  locale,
}: BuildingDetailPageProps) {
  const router = useRouter();
  const { data: building, isLoading: buildingLoading } =
    useGetBuildingQuery(buildingId);
  const { data: floors, isLoading: floorsLoading } =
    useListFloorsQuery(buildingId);
  const [createFloor, { isLoading: creating }] = useCreateFloorMutation();
  const [updateFloor, { isLoading: updating }] = useUpdateFloorMutation();
  const [deleteFloor, { isLoading: deleting }] = useDeleteFloorMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FloorResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FloorResponse | null>(null);

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateFloorFormValues>({
    resolver: zodResolver(createFloorSchema),
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditFloorFormValues>({
    resolver: zodResolver(editFloorSchema),
  });

  function goToFloor(floorId: string) {
    router.push(
      `/${locale}/dashboard/buildings/${buildingId}/floors/${floorId}`,
    );
  }

  async function onCreateSubmit(values: CreateFloorFormValues) {
    try {
      await createFloor({
        buildingId,
        body: { name: values.name, notes: values.notes || undefined },
      }).unwrap();
      toast.success('Floor created.');
      setCreateOpen(false);
      resetCreate();
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to create floor.');
    }
  }

  function openEdit(floor: FloorResponse) {
    setEditTarget(floor);
    resetEdit({
      name: floor.name,
      order: String(floor.order),
      notes: floor.notes ?? '',
    });
  }

  async function onEditSubmit(values: EditFloorFormValues) {
    if (!editTarget) return;
    try {
      await updateFloor({
        buildingId,
        floorId: editTarget.id,
        body: {
          name: values.name,
          order: Number(values.order),
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success('Floor updated.');
      setEditTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to update floor.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFloor({ buildingId, floorId: deleteTarget.id }).unwrap();
      toast.success('Floor deleted.');
      setDeleteTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to delete floor.');
    }
  }

  if (buildingLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Building info header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Building2Icon className="size-6 text-muted-foreground" />
          {building?.name ?? 'Building'}
        </h1>
      </div>

      <div className="rounded-xl border bg-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Code</p>
          <p className="text-sm font-mono">{building?.code ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Address</p>
          <p className="text-sm">{building?.address ?? '—'}</p>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-sm whitespace-pre-wrap">
            {building?.notes ?? '—'}
          </p>
        </div>
      </div>

      {/* Floors section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Floors</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? 'Manage this building’s floors.'
              : 'Floors in this building.'}
          </p>
        </div>
        {canWrite ? (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Add floor
          </Button>
        ) : (
          <Badge
            variant="outline"
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <EyeIcon className="size-3" />
            Read-only
          </Badge>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Apartment count</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {floorsLoading ? (
              <>
                {[...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : floors?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <Layers2Icon className="size-8 mx-auto mb-2 opacity-30" />
                  No floors yet.
                </TableCell>
              </TableRow>
            ) : (
              floors?.map((floor) => (
                <TableRow
                  key={floor.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => goToFloor(floor.id)}
                >
                  <TableCell>
                    <span className="font-medium text-sm">{floor.name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {floor.order}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {floor.notes ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {floor.apartmentCount}
                  </TableCell>
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Floor actions"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => goToFloor(floor.id)}>
                            <EyeIcon className="size-3.5 mr-1.5" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(floor)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(floor)}
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

      {/* ── Create Floor Dialog ────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add floor</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="f-name"
                placeholder="2nd Floor"
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
              <Label htmlFor="f-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="f-notes"
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

      {/* ── Edit Floor Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit floor</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fe-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fe-name"
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
              <Label htmlFor="fe-order">Order</Label>
              <Input
                id="fe-order"
                type="number"
                min={0}
                aria-invalid={!!editErrors.order}
                {...regEdit('order')}
              />
              {editErrors.order && (
                <p className="text-xs text-destructive">
                  {editErrors.order.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fe-notes">Notes</Label>
              <Textarea id="fe-notes" rows={2} {...regEdit('notes')} />
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
            <DialogTitle>Delete floor</DialogTitle>
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
    </div>
  );
}

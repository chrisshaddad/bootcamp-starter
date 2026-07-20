'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Zod schemas ───────────────────────────────────────────────────────────────

function buildBuildingSchema(
  errors: Dictionary['buildings']['list']['errors'],
) {
  return z.object({
    name: z.string().min(1, errors.name),
    address: z.string().optional(),
    code: z.string().optional(),
    notes: z.string().optional(),
  });
}

type BuildingFormValues = z.infer<ReturnType<typeof buildBuildingSchema>>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Roles that can be assigned to buildings */
const ASSIGNABLE: AssignableRole[] = ['supervisor', 'maintenance'];

// ── Main component ────────────────────────────────────────────────────────────

interface BuildingsPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
  locale: string;
  dict: Dictionary;
}

export function BuildingsPage({ canWrite, locale, dict }: BuildingsPageProps) {
  const t = dict.buildings.list;
  const shared = dict.buildings.shared;
  const router = useRouter();
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

  const schema = useMemo(() => buildBuildingSchema(t.errors), [t.errors]);

  // ── Create form ────────────────────────────────────────────────────────────

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<BuildingFormValues>({
    resolver: zodResolver(schema),
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<BuildingFormValues>({
    resolver: zodResolver(schema),
  });

  async function onCreateSubmit(values: BuildingFormValues) {
    try {
      await createBuilding({
        name: values.name,
        address: values.address || undefined,
        code: values.code || undefined,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success(t.toasts.created);
      setCreateOpen(false);
      resetCreate();
    } catch (err: unknown) {
      const apiErr = err as { data?: { code?: string } };
      if (apiErr?.data?.code === 'BUILDINGS_LIMIT_REACHED') {
        toast.error(t.toasts.createLimitReached);
      } else {
        toast.error(t.toasts.createError);
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
      toast.success(t.toasts.updated);
      setEditTarget(null);
    } catch {
      toast.error(t.toasts.updateError);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBuilding(deleteTarget.id).unwrap();
      toast.success(t.toasts.deleted);
      setDeleteTarget(null);
    } catch {
      toast.error(t.toasts.deleteError);
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
      toast.success(t.toasts.assignmentsUpdated);
      setAssignTarget(null);
    } catch {
      toast.error(t.toasts.assignmentsError);
    }
  }

  // Staff users that can be assigned (supervisor / maintenance)
  const assignableUsers = (allUsers ?? []).filter((m) =>
    (ASSIGNABLE as string[]).includes(m.role),
  );

  function goToBuilding(buildingId: string) {
    router.push(`/${locale}/dashboard/buildings/${buildingId}`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite ? t.subtitleWrite : t.subtitleReadOnly}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              {shared.readOnly}
            </Badge>
          )}
          {canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {t.addBuilding}
            </Button>
          )}
        </div>
      </div>

      {/* Buildings table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.table.building}</TableHead>
              <TableHead>{t.table.code}</TableHead>
              <TableHead>{t.table.address}</TableHead>
              <TableHead>{t.table.assignedStaff}</TableHead>
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
                  {canWrite ? t.emptyWrite : t.empty}
                </TableCell>
              </TableRow>
            ) : (
              buildings?.map((building) => (
                <TableRow
                  key={building.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToBuilding(building.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToBuilding(building.id);
                    }
                  }}
                >
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t.actions.ariaLabel}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={
                              <Link
                                href={`/${locale}/dashboard/buildings/${building.id}`}
                              />
                            }
                          >
                            <EyeIcon className="size-3.5 mr-1.5" />
                            {shared.view}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(building)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAssign(building)}
                          >
                            <UsersIcon className="size-3.5 mr-1.5" />
                            {t.actions.assignStaff}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(building)}
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

      {/* ── Create Building Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.createDialog.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-name">
                {t.createDialog.name}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="b-name"
                placeholder={t.createDialog.namePlaceholder}
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
                {t.createDialog.code}{' '}
                <span className="text-muted-foreground font-normal">
                  {shared.optional}
                </span>
              </Label>
              <Input
                id="b-code"
                placeholder={t.createDialog.codePlaceholder}
                {...regCreate('code')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-address">
                {t.createDialog.address}{' '}
                <span className="text-muted-foreground font-normal">
                  {shared.optional}
                </span>
              </Label>
              <Input
                id="b-address"
                placeholder={t.createDialog.addressPlaceholder}
                {...regCreate('address')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-notes">
                {t.createDialog.notes}{' '}
                <span className="text-muted-foreground font-normal">
                  {shared.optional}
                </span>
              </Label>
              <Textarea
                id="b-notes"
                placeholder={t.createDialog.notesPlaceholder}
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
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.createDialog.creating : t.createDialog.create}
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
            <DialogTitle>{t.editDialog.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="be-name">
                {t.editDialog.name} <span className="text-destructive">*</span>
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
              <Label htmlFor="be-code">{t.editDialog.code}</Label>
              <Input id="be-code" {...regEdit('code')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="be-address">{t.editDialog.address}</Label>
              <Input id="be-address" {...regEdit('address')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="be-notes">{t.editDialog.notes}</Label>
              <Textarea id="be-notes" rows={2} {...regEdit('notes')} />
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.editDialog.saving : dict.common.save}
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
            <DialogTitle>{t.deleteDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {t.deleteDialog.confirmPrefix}{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              {t.deleteDialog.confirmSuffix}
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
              {deleting ? t.deleteDialog.deleting : dict.common.delete}
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
            <DialogTitle>
              {t.assignDialog.title.replace('{name}', assignTarget?.name ?? '')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <p className="text-sm text-muted-foreground">
              {t.assignDialog.description}
            </p>
            {assignableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.assignDialog.noStaff}
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
              {dict.common.cancel}
            </DialogClose>
            <Button onClick={handleSaveAssignments} disabled={assigning}>
              {assigning ? t.assignDialog.saving : dict.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

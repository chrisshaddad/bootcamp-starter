'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  MoreHorizontalIcon,
  ContactIcon,
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

import {
  useListRentersQuery,
  useCreateRenterMutation,
  useUpdateRenterMutation,
  useDeleteRenterMutation,
} from '@/store/api/endpoints/renters.api';
import type { RenterEffectiveStatus, RenterResponse } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Status badge ─────────────────────────────────────────────────────────────

function RenterStatusBadge({
  status,
  labels,
}: {
  status: RenterEffectiveStatus;
  labels: Dictionary['renters']['status'];
}) {
  switch (status) {
    case 'current':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {labels.current}
        </Badge>
      );
    case 'former':
      return <Badge variant="secondary">{labels.former}</Badge>;
    case 'none':
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {labels.none}
        </Badge>
      );
  }
}

// ── Zod schema ────────────────────────────────────────────────────────────────

function buildRenterSchema(t: Dictionary['renters']['dialog']) {
  return z.object({
    fullName: z.string().min(1, t.fullNameRequired),
    email: z.string().email(t.invalidEmail).optional().or(z.literal('')),
    phone: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    notes: z.string().optional(),
  });
}

type RenterFormValues = z.infer<ReturnType<typeof buildRenterSchema>>;

const EMPTY_VALUES: RenterFormValues = {
  fullName: '',
  email: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
};

// ── Main component ────────────────────────────────────────────────────────────

interface RentersPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
  locale: string;
  dict: Dictionary;
}

export function RentersPage({ canWrite, locale, dict }: RentersPageProps) {
  const t = dict.renters;
  const router = useRouter();
  const { data: renters, isLoading, isError } = useListRentersQuery();
  const [createRenter, { isLoading: creating }] = useCreateRenterMutation();
  const [updateRenter, { isLoading: updating }] = useUpdateRenterMutation();
  const [deleteRenter, { isLoading: deleting }] = useDeleteRenterMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RenterResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RenterResponse | null>(null);

  const renterSchema = useMemo(() => buildRenterSchema(t.dialog), [t.dialog]);

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<RenterFormValues>({
    resolver: zodResolver(renterSchema),
    defaultValues: EMPTY_VALUES,
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<RenterFormValues>({
    resolver: zodResolver(renterSchema),
    defaultValues: EMPTY_VALUES,
  });

  function goToRenter(renterId: string) {
    router.push(`/${locale}/dashboard/renters/${renterId}`);
  }

  async function onCreateSubmit(values: RenterFormValues) {
    try {
      await createRenter({
        fullName: values.fullName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        emergencyContactName: values.emergencyContactName || undefined,
        emergencyContactPhone: values.emergencyContactPhone || undefined,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success(t.dialog.createdToast);
      setCreateOpen(false);
      resetCreate(EMPTY_VALUES);
    } catch {
      toast.error(t.dialog.createErrorToast);
    }
  }

  function openEdit(renter: RenterResponse) {
    setEditTarget(renter);
    resetEdit({
      fullName: renter.fullName,
      email: renter.email ?? '',
      phone: renter.phone ?? '',
      emergencyContactName: renter.emergencyContactName ?? '',
      emergencyContactPhone: renter.emergencyContactPhone ?? '',
      notes: renter.notes ?? '',
    });
  }

  async function onEditSubmit(values: RenterFormValues) {
    if (!editTarget) return;
    try {
      await updateRenter({
        id: editTarget.id,
        body: {
          fullName: values.fullName,
          email: values.email || undefined,
          phone: values.phone || undefined,
          emergencyContactName: values.emergencyContactName || undefined,
          emergencyContactPhone: values.emergencyContactPhone || undefined,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success(t.dialog.updatedToast);
      setEditTarget(null);
    } catch {
      toast.error(t.dialog.updateErrorToast);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRenter(deleteTarget.id).unwrap();
      toast.success(t.dialog.deletedToast);
      setDeleteTarget(null);
    } catch {
      toast.error(t.dialog.deleteErrorToast);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.list.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite ? t.list.subtitleWrite : t.list.subtitleReadOnly}
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
              {t.list.addRenter}
            </Button>
          )}
        </div>
      </div>

      {/* Renters table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.list.table.fullName}</TableHead>
              <TableHead>{t.list.table.email}</TableHead>
              <TableHead>{t.list.table.phone}</TableHead>
              <TableHead>{t.list.table.status}</TableHead>
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
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.list.loadError}
                </TableCell>
              </TableRow>
            ) : renters?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ContactIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite ? t.list.emptyWrite : t.list.empty}
                </TableCell>
              </TableRow>
            ) : (
              renters?.map((renter) => (
                <TableRow
                  key={renter.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToRenter(renter.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToRenter(renter.id);
                    }
                  }}
                >
                  <TableCell>
                    <span className="font-medium text-sm">
                      {renter.fullName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {renter.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {renter.phone ?? '—'}
                  </TableCell>
                  <TableCell>
                    <RenterStatusBadge
                      status={renter.effectiveStatus}
                      labels={t.status}
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
                            onClick={() => goToRenter(renter.id)}
                          >
                            <EyeIcon className="size-3.5 mr-1.5" />
                            {t.list.view}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(renter)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(renter)}
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

      {/* ── Create Renter Dialog ───────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.addTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <RenterFormFields
              idPrefix="r"
              register={regCreate}
              errors={createErrors}
              t={t.dialog}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(EMPTY_VALUES);
                }}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.dialog.creating : t.dialog.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Renter Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.editTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <RenterFormFields
              idPrefix="re"
              register={regEdit}
              errors={editErrors}
              t={t.dialog}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.dialog.saving : dict.common.save}
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
            <DialogTitle>{t.dialog.deleteTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {(() => {
                const [before, after] = t.dialog.deleteConfirm.split('{name}');
                return (
                  <>
                    {before}
                    <span className="font-medium text-foreground">
                      {deleteTarget?.fullName}
                    </span>
                    {after}
                  </>
                );
              })()}
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
              {deleting ? t.dialog.deleting : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared form fields (create + edit dialogs) ────────────────────────────────

function RenterFormFields({
  idPrefix,
  register,
  errors,
  t,
}: {
  idPrefix: string;
  register: ReturnType<typeof useForm<RenterFormValues>>['register'];
  errors: ReturnType<typeof useForm<RenterFormValues>>['formState']['errors'];
  t: Dictionary['renters']['dialog'];
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-fullName`}>
          {t.fullName} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-fullName`}
          placeholder={t.placeholderFullName}
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-email`}>
          {t.email}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder={t.placeholderEmail}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>
          {t.phone}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-phone`}
          placeholder={t.placeholderPhone}
          {...register('phone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-emergencyContactName`}>
          {t.emergencyContactName}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-emergencyContactName`}
          placeholder={t.placeholderEmergencyContactName}
          {...register('emergencyContactName')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-emergencyContactPhone`}>
          {t.emergencyContactPhone}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-emergencyContactPhone`}
          placeholder={t.placeholderEmergencyContactPhone}
          {...register('emergencyContactPhone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          {t.notes}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder={t.placeholderNotes}
          rows={2}
          {...register('notes')}
        />
      </div>
    </>
  );
}

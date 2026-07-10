'use client';

import { useState } from 'react';
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

// ── Status badge ─────────────────────────────────────────────────────────────

function RenterStatusBadge({ status }: { status: RenterEffectiveStatus }) {
  switch (status) {
    case 'current':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Current
        </Badge>
      );
    case 'former':
      return <Badge variant="secondary">Former</Badge>;
    case 'none':
    default:
      return (
        <Badge variant="outline" className="text-xs">
          No lease yet
        </Badge>
      );
  }
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const renterSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
});

type RenterFormValues = z.infer<typeof renterSchema>;

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
}

export function RentersPage({ canWrite, locale }: RentersPageProps) {
  const router = useRouter();
  const { data: renters, isLoading, isError } = useListRentersQuery();
  const [createRenter, { isLoading: creating }] = useCreateRenterMutation();
  const [updateRenter, { isLoading: updating }] = useUpdateRenterMutation();
  const [deleteRenter, { isLoading: deleting }] = useDeleteRenterMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RenterResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RenterResponse | null>(null);

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
      toast.success('Renter created.');
      setCreateOpen(false);
      resetCreate(EMPTY_VALUES);
    } catch {
      toast.error('Failed to create renter. Please try again.');
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
      toast.success('Renter updated.');
      setEditTarget(null);
    } catch {
      toast.error('Failed to update renter.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRenter(deleteTarget.id).unwrap();
      toast.success('Renter deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete renter.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Renters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? "Manage your organization's renters."
              : 'Renters in your organization.'}
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
              Add renter
            </Button>
          )}
        </div>
      </div>

      {/* Renters table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
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
                  Failed to load renters. Please try again.
                </TableCell>
              </TableRow>
            ) : renters?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ContactIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite
                    ? 'No renters yet. Add your first renter.'
                    : 'No renters yet.'}
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
                    <RenterStatusBadge status={renter.effectiveStatus} />
                  </TableCell>
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Renter actions"
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
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(renter)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(renter)}
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

      {/* ── Create Renter Dialog ───────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add renter</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <RenterFormFields
              idPrefix="r"
              register={regCreate}
              errors={createErrors}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(EMPTY_VALUES);
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

      {/* ── Edit Renter Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit renter</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <RenterFormFields
              idPrefix="re"
              register={regEdit}
              errors={editErrors}
            />
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
            <DialogTitle>Delete renter</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.fullName}
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

// ── Shared form fields (create + edit dialogs) ────────────────────────────────

function RenterFormFields({
  idPrefix,
  register,
  errors,
}: {
  idPrefix: string;
  register: ReturnType<typeof useForm<RenterFormValues>>['register'];
  errors: ReturnType<typeof useForm<RenterFormValues>>['formState']['errors'];
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-fullName`}>
          Full name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-fullName`}
          placeholder="Jane Doe"
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-email`}>
          Email{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="jane@example.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>
          Phone{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-phone`}
          placeholder="+971 50 123 4567"
          {...register('phone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-emergencyContactName`}>
          Emergency contact name{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-emergencyContactName`}
          placeholder="John Doe"
          {...register('emergencyContactName')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-emergencyContactPhone`}>
          Emergency contact phone{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`${idPrefix}-emergencyContactPhone`}
          placeholder="+971 50 987 6543"
          {...register('emergencyContactPhone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          Notes{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder="Any notes…"
          rows={2}
          {...register('notes')}
        />
      </div>
    </>
  );
}

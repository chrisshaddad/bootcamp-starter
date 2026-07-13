'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AlertTriangle,
  Building2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  UserX,
} from 'lucide-react';
import {
  branchCreateRequestSchema,
  type BranchCreateRequest,
  type BranchResponse,
} from '@repo/contracts';
import { useBranches, useBranchActions } from '@/hooks/use-branches';
import { ApiError } from '@/lib/api';
import { LocationPicker } from '@/components/location-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ENTER, enterStyle } from '@/lib/enter-animation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// The branch identity rules (name, address) come straight from the API contract
// via `.pick()` so they can't drift from the server. The form only adds the
// concerns the contract doesn't model for a text form: a plain phone field
// (mapped to phoneNumber on submit) and coordinate *string* inputs that must
// reject an empty value — the contract coerces numbers, where '' would become a
// valid 0 and slip through. The submit handler maps these back to
// BranchCreateRequest (phone → phoneNumber, strings → numbers).
const branchFormSchema = branchCreateRequestSchema
  .pick({ name: true, address: true })
  .extend({
    phone: z.string().trim().max(20),
    latitude: z
      .string()
      .trim()
      .refine((value) => {
        const parsed = Number(value);
        return (
          value !== '' && !Number.isNaN(parsed) && parsed >= -90 && parsed <= 90
        );
      }, 'Latitude must be between -90 and 90'),
    longitude: z
      .string()
      .trim()
      .refine((value) => {
        const parsed = Number(value);
        return (
          value !== '' &&
          !Number.isNaN(parsed) &&
          parsed >= -180 &&
          parsed <= 180
        );
      }, 'Longitude must be between -180 and 180'),
  });

type BranchFormValues = z.infer<typeof branchFormSchema>;

function toBranchFormValues(branch?: BranchResponse | null): BranchFormValues {
  return {
    name: branch?.name ?? '',
    phone: branch?.phoneNumber ?? '',
    address: branch?.address ?? '',
    latitude: branch ? String(branch.latitude) : '',
    longitude: branch ? String(branch.longitude) : '',
  };
}

// ---------------------------------------------------------------------------
// Create / edit dialog
// ---------------------------------------------------------------------------

function BranchFormDialog({
  branch,
  onClose,
}: {
  branch?: BranchResponse | null;
  onClose: () => void;
}) {
  const { createBranch, updateBranch } = useBranchActions();
  const isEdit = Boolean(branch);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: toBranchFormValues(branch),
  });

  const onSubmit = async (data: BranchFormValues) => {
    const payload: BranchCreateRequest = {
      name: data.name,
      phoneNumber: data.phone || null,
      address: data.address,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    };
    try {
      if (branch) {
        await updateBranch(branch.id, payload);
        toast.success(`Updated ${payload.name}.`);
      } else {
        await createBranch(payload);
        toast.success(`Added ${payload.name}.`);
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to save branch.',
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit branch' : 'New branch'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update this branch’s details and location.'
                : 'Add a branch to your pharmacy with its address and location.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Branch name
              </label>
              <Input {...register('name')} placeholder="Downtown Branch" />
              {errors.name ? (
                <p className="text-xs text-error">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <Input {...register('phone')} placeholder="+961 1 234 567" />
              {errors.phone ? (
                <p className="text-xs text-error">{errors.phone.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Address
              </label>
              <Input {...register('address')} placeholder="123 Main St, City" />
              {errors.address ? (
                <p className="text-xs text-error">{errors.address.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Location
              </label>
              <LocationPicker
                latitude={watch('latitude') ?? ''}
                longitude={watch('longitude') ?? ''}
                onChange={(lat, lng) => {
                  setValue('latitude', lat, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setValue('longitude', lng, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Latitude
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('latitude')}
                    inputMode="decimal"
                    placeholder="33.8938"
                    className="pl-9"
                  />
                </div>
                {errors.latitude ? (
                  <p className="text-xs text-error">
                    {errors.latitude.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Longitude
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...register('longitude')}
                    inputMode="decimal"
                    placeholder="35.5018"
                    className="pl-9"
                  />
                </div>
                {errors.longitude ? (
                  <p className="text-xs text-error">
                    {errors.longitude.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving…'
                : isEdit
                  ? 'Save changes'
                  : 'Add branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete dialog
// ---------------------------------------------------------------------------

function DeleteBranchDialog({
  branch,
  onClose,
}: {
  branch: BranchResponse;
  onClose: () => void;
}) {
  const { deleteBranch } = useBranchActions();
  const [deleting, setDeleting] = useState(false);
  // UI warning only — the API re-checks and rejects a delete with staff anyway.
  const blocked = branch.userCount > 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteBranch(branch.id);
      toast.success(`Deleted ${branch.name}.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to delete branch.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete branch</DialogTitle>
          <DialogDescription>
            {blocked ? (
              <>
                {branch.name} still has {branch.userCount}{' '}
                {branch.userCount === 1 ? 'staff member' : 'staff members'}{' '}
                assigned. Reassign them to another branch before deleting it.
              </>
            ) : (
              <>
                This permanently deletes {branch.name}. This action cannot be
                undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
          >
            {blocked ? 'Close' : 'Cancel'}
          </Button>
          {!blocked ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete branch'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function BranchRow({
  branch,
  onEdit,
  onDelete,
}: {
  branch: BranchResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
            <Building2 className="h-4 w-4" />
          </div>
          <p className="truncate font-medium text-gray-900">{branch.name}</p>
        </div>
      </TableCell>

      <TableCell className="text-gray-700">
        {branch.phoneNumber ? (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            {branch.phoneNumber}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>

      <TableCell>
        <span className="line-clamp-1 max-w-xs text-sm text-gray-600">
          {branch.address}
        </span>
      </TableCell>

      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          {branch.userCount}
        </span>
      </TableCell>

      <TableCell className="text-gray-500">
        {formatDate(branch.createdAt)}
      </TableCell>

      <TableCell className="text-right">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`Actions for ${branch.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-error focus:text-error"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STAT_TILES = [
  {
    key: 'TOTAL',
    label: 'Branches',
    icon: Building2,
    iconClass: 'bg-primary-100 text-primary-hover',
  },
  {
    key: 'STAFF',
    label: 'Total staff',
    icon: Users,
    iconClass: 'bg-success/10 text-success',
  },
  {
    key: 'UNSTAFFED',
    label: 'Unstaffed',
    icon: UserX,
    iconClass: 'bg-warning/15 text-warning-dark',
  },
] as const;

export default function BranchesPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchResponse | null>(null);
  const [deleting, setDeleting] = useState<BranchResponse | null>(null);

  const { branches, isLoading, error, mutate } = useBranches();

  const stats: Record<string, number> = useMemo(() => {
    const list = branches ?? [];
    return {
      TOTAL: list.length,
      STAFF: list.reduce((sum, branch) => sum + branch.userCount, 0),
      UNSTAFFED: list.filter((branch) => branch.userCount === 0).length,
    };
  }, [branches]);

  const rows = useMemo(() => {
    if (!branches) return branches;
    const query = search.trim().toLowerCase();
    if (!query) return branches;
    return branches.filter(
      (branch) =>
        branch.name.toLowerCase().includes(query) ||
        branch.address.toLowerCase().includes(query) ||
        (branch.phoneNumber?.toLowerCase().includes(query) ?? false),
    );
  }, [branches, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(branch: BranchResponse) {
    setEditing(branch);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div
        className={`flex items-start justify-between gap-4 ${ENTER}`}
        style={enterStyle(0)}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your pharmacy’s branches, their locations, and the staff
            assigned to each.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-12 w-40 shrink-0 justify-center px-6 text-base"
          onClick={openCreate}
        >
          <Plus className="h-5 w-5" />
          New branch
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {STAT_TILES.map((tile, index) => (
          <Card
            key={tile.key}
            className={`py-0 ${ENTER}`}
            style={enterStyle(70 + index * 70)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.iconClass}`}
              >
                <tile.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-500">{tile.label}</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-6 w-8" />
                ) : (
                  <p className="text-xl font-semibold text-gray-900">
                    {stats[tile.key] ?? 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`${ENTER}`} style={enterStyle(300)}>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search branches by name, address, or phone…"
            className="h-9 w-full pl-9"
          />
        </div>
      </div>

      <Card
        className={`gap-0 overflow-hidden py-0 ${ENTER}`}
        style={enterStyle(360)}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load branches
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching your branches. Please try
              again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 flex-1" />
              </div>
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No branches found
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              {branches && branches.length > 0
                ? 'No branches match your search.'
                : 'Add your first branch to start assigning staff and stock.'}
            </p>
            {branches && branches.length === 0 ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New branch
              </Button>
            ) : null}
          </div>
        ) : (
          <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Branch</TableHead>
                <TableHead className="w-44">Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-24">Staff</TableHead>
                <TableHead className="w-28">Added</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((branch) => (
                <BranchRow
                  key={branch.id}
                  branch={branch}
                  onEdit={() => openEdit(branch)}
                  onDelete={() => setDeleting(branch)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {formOpen ? (
        <BranchFormDialog
          branch={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteBranchDialog
          branch={deleting}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  Layers2Icon,
  DoorOpenIcon,
  PlusIcon,
  MoreHorizontalIcon,
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

import { useGetBuildingQuery } from '@/store/api/endpoints/buildings.api';
import { useGetFloorQuery } from '@/store/api/endpoints/floors.api';
import {
  useListApartmentsQuery,
  useCreateApartmentMutation,
  useUpdateApartmentMutation,
  useDeleteApartmentMutation,
} from '@/store/api/endpoints/apartments.api';
import type { ApartmentResponse, ApartmentStatus } from '@/types/api';

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ApartmentStatus, string> = {
  vacant: 'Vacant',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  unavailable: 'Unavailable',
};

function StatusBadge({ status }: { status: ApartmentStatus }) {
  switch (status) {
    case 'occupied':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Occupied
        </Badge>
      );
    case 'maintenance':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          Maintenance
        </Badge>
      );
    case 'unavailable':
      return <Badge variant="destructive">Unavailable</Badge>;
    case 'vacant':
    default:
      return <Badge variant="secondary">Vacant</Badge>;
  }
}

// ── Zod schema ───────────────────────────────────────────────────────────────

const numericField = (label: string) =>
  z
    .string()
    .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), {
      message: `${label} must be a number`,
    })
    .refine((v) => Number(v) >= 0, { message: `${label} cannot be negative` });

const apartmentSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  bedrooms: numericField('Bedrooms').refine(
    (v) => Number.isInteger(Number(v)),
    { message: 'Bedrooms must be a whole number' },
  ),
  bathrooms: numericField('Bathrooms'),
  sqft: z.string().optional(),
  status: z.enum(['vacant', 'occupied', 'maintenance', 'unavailable']),
  notes: z.string().optional(),
});
type ApartmentFormValues = z.infer<typeof apartmentSchema>;

const DEFAULT_VALUES: ApartmentFormValues = {
  unitNumber: '',
  bedrooms: '0',
  bathrooms: '0',
  sqft: '',
  status: 'vacant',
  notes: '',
};

// ── Main component ────────────────────────────────────────────────────────────

interface FloorDetailPageProps {
  buildingId: string;
  floorId: string;
  canWrite: boolean;
  locale: string;
}

export function FloorDetailPage({
  buildingId,
  floorId,
  canWrite,
  locale,
}: FloorDetailPageProps) {
  const { data: building } = useGetBuildingQuery(buildingId);
  const { data: floor, isLoading: floorLoading } = useGetFloorQuery({
    buildingId,
    floorId,
  });
  const { data: apartments, isLoading: apartmentsLoading } =
    useListApartmentsQuery({ buildingId, floorId });
  const [createApartment, { isLoading: creating }] =
    useCreateApartmentMutation();
  const [updateApartment, { isLoading: updating }] =
    useUpdateApartmentMutation();
  const [deleteApartment, { isLoading: deleting }] =
    useDeleteApartmentMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApartmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApartmentResponse | null>(
    null,
  );

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    control: controlCreate,
    formState: { errors: createErrors },
  } = useForm<ApartmentFormValues>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    control: controlEdit,
    formState: { errors: editErrors },
  } = useForm<ApartmentFormValues>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function toBody(values: ApartmentFormValues) {
    return {
      unitNumber: values.unitNumber,
      bedrooms: Number(values.bedrooms),
      bathrooms: Number(values.bathrooms),
      sqft: values.sqft ? Number(values.sqft) : undefined,
      status: values.status,
      notes: values.notes || undefined,
    };
  }

  async function onCreateSubmit(values: ApartmentFormValues) {
    try {
      await createApartment({
        buildingId,
        floorId,
        body: toBody(values),
      }).unwrap();
      toast.success('Apartment created.');
      setCreateOpen(false);
      resetCreate(DEFAULT_VALUES);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to create apartment.');
    }
  }

  function openEdit(apartment: ApartmentResponse) {
    setEditTarget(apartment);
    resetEdit({
      unitNumber: apartment.unitNumber,
      bedrooms: String(apartment.bedrooms),
      bathrooms: apartment.bathrooms,
      sqft: apartment.sqft != null ? String(apartment.sqft) : '',
      status: apartment.status,
      notes: apartment.notes ?? '',
    });
  }

  async function onEditSubmit(values: ApartmentFormValues) {
    if (!editTarget) return;
    try {
      await updateApartment({
        buildingId,
        floorId,
        apartmentId: editTarget.id,
        body: toBody(values),
      }).unwrap();
      toast.success('Apartment updated.');
      setEditTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to update apartment.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteApartment({
        buildingId,
        floorId,
        apartmentId: deleteTarget.id,
      }).unwrap();
      toast.success('Apartment deleted.');
      setDeleteTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? 'Failed to delete apartment.');
    }
  }

  if (floorLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href={`/${locale}/dashboard/buildings/${buildingId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        {building?.name ?? 'Back to building'}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Layers2Icon className="size-6 text-muted-foreground" />
          {floor?.name ?? 'Floor'}
        </h1>
      </div>

      {/* Apartments section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Apartments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? 'Manage the apartments on this floor.'
              : 'Apartments on this floor.'}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              resetCreate(DEFAULT_VALUES);
              setCreateOpen(true);
            }}
          >
            <PlusIcon />
            Add apartment
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit Number</TableHead>
              <TableHead>Bed/Bath</TableHead>
              <TableHead>Sqft</TableHead>
              <TableHead>Status</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {apartmentsLoading ? (
              <>
                {[...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : apartments?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <DoorOpenIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No apartments yet.
                </TableCell>
              </TableRow>
            ) : (
              apartments?.map((apartment) => (
                <TableRow key={apartment.id}>
                  <TableCell>
                    <span className="font-medium text-sm">
                      {apartment.unitNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {apartment.bedrooms} bd / {Number(apartment.bathrooms)} ba
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {apartment.sqft ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={apartment.status} />
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Apartment actions"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(apartment)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(apartment)}
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

      {/* ── Create Apartment Dialog ────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add apartment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <ApartmentFormFields
              register={regCreate}
              control={controlCreate}
              errors={createErrors}
              idPrefix="a"
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(DEFAULT_VALUES);
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

      {/* ── Edit Apartment Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit apartment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <ApartmentFormFields
              register={regEdit}
              control={controlEdit}
              errors={editErrors}
              idPrefix="ae"
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
            <DialogTitle>Delete apartment</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete unit{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.unitNumber}
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

// ── Shared form fields (create + edit dialogs) ─────────────────────────────────

function ApartmentFormFields({
  register,
  control,
  errors,
  idPrefix,
}: {
  register: ReturnType<typeof useForm<ApartmentFormValues>>['register'];
  control: ReturnType<typeof useForm<ApartmentFormValues>>['control'];
  errors: ReturnType<
    typeof useForm<ApartmentFormValues>
  >['formState']['errors'];
  idPrefix: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-unit`}>
          Unit number <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-unit`}
          placeholder="101"
          aria-invalid={!!errors.unitNumber}
          {...register('unitNumber')}
        />
        {errors.unitNumber && (
          <p className="text-xs text-destructive">
            {errors.unitNumber.message}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-bedrooms`}>
            Bedrooms <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${idPrefix}-bedrooms`}
            type="number"
            min={0}
            aria-invalid={!!errors.bedrooms}
            {...register('bedrooms')}
          />
          {errors.bedrooms && (
            <p className="text-xs text-destructive">
              {errors.bedrooms.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-bathrooms`}>
            Bathrooms <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${idPrefix}-bathrooms`}
            type="number"
            min={0}
            step={0.5}
            aria-invalid={!!errors.bathrooms}
            {...register('bathrooms')}
          />
          {errors.bathrooms && (
            <p className="text-xs text-destructive">
              {errors.bathrooms.message}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-sqft`}>
            Sqft{' '}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id={`${idPrefix}-sqft`}
            type="number"
            min={0}
            {...register('sqft')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-status`}>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val) => field.onChange(val as ApartmentStatus)}
              >
                <SelectTrigger id={`${idPrefix}-status`} className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as ApartmentStatus[]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          Notes{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea id={`${idPrefix}-notes`} rows={2} {...register('notes')} />
      </div>
    </>
  );
}

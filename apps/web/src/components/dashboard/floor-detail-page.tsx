'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Status badge ───────────────────────────────────────────────────────────────

/** Display order for the status select/badges (values are not user-facing). */
const STATUS_VALUES: ApartmentStatus[] = [
  'vacant',
  'occupied',
  'maintenance',
  'unavailable',
];

function StatusBadge({
  status,
  labels,
}: {
  status: ApartmentStatus;
  labels: Dictionary['buildings']['apartmentStatus'];
}) {
  switch (status) {
    case 'occupied':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {labels.occupied}
        </Badge>
      );
    case 'maintenance':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-200"
        >
          {labels.maintenance}
        </Badge>
      );
    case 'unavailable':
      return <Badge variant="destructive">{labels.unavailable}</Badge>;
    case 'vacant':
    default:
      return <Badge variant="secondary">{labels.vacant}</Badge>;
  }
}

// ── Zod schema ───────────────────────────────────────────────────────────────

function buildApartmentSchema(
  errors: Dictionary['buildings']['floor']['errors'],
) {
  const numericField = (requiredMessage: string, negativeMessage: string) =>
    z
      .string()
      .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), {
        message: requiredMessage,
      })
      .refine((v) => Number(v) >= 0, { message: negativeMessage });

  return z.object({
    unitNumber: z.string().min(1, errors.unitNumber),
    bedrooms: numericField(
      errors.bedroomsRequired,
      errors.bedroomsNegative,
    ).refine((v) => Number.isInteger(Number(v)), {
      message: errors.bedroomsInteger,
    }),
    bathrooms: numericField(errors.bathroomsRequired, errors.bathroomsNegative),
    sqft: z.string().optional(),
    status: z.enum(['vacant', 'occupied', 'maintenance', 'unavailable']),
    notes: z.string().optional(),
  });
}
type ApartmentFormValues = z.infer<ReturnType<typeof buildApartmentSchema>>;

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
  dict: Dictionary;
}

export function FloorDetailPage({
  buildingId,
  floorId,
  canWrite,
  locale,
  dict,
}: FloorDetailPageProps) {
  const t = dict.buildings.floor;
  const shared = dict.buildings.shared;
  const statusLabels = dict.buildings.apartmentStatus;
  const router = useRouter();
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

  const schema = useMemo(() => buildApartmentSchema(t.errors), [t.errors]);

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    control: controlCreate,
    formState: { errors: createErrors },
  } = useForm<ApartmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    control: controlEdit,
    formState: { errors: editErrors },
  } = useForm<ApartmentFormValues>({
    resolver: zodResolver(schema),
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
      toast.success(t.toasts.created);
      setCreateOpen(false);
      resetCreate(DEFAULT_VALUES);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? t.toasts.createError);
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
      toast.success(t.toasts.updated);
      setEditTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? t.toasts.updateError);
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
      toast.success(t.toasts.deleted);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr?.data?.message ?? t.toasts.deleteError);
    }
  }

  function goToApartment(apartmentId: string) {
    router.push(
      `/${locale}/dashboard/buildings/${buildingId}/floors/${floorId}/apartments/${apartmentId}`,
    );
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
        {building?.name ?? t.backToBuilding}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Layers2Icon className="size-6 text-muted-foreground" />
          {floor?.name ?? t.titleFallback}
        </h1>
      </div>

      {/* Apartments section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t.apartmentsSection.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite
              ? t.apartmentsSection.subtitleWrite
              : t.apartmentsSection.subtitleReadOnly}
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
            {t.addApartment}
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.table.unitNumber}</TableHead>
              <TableHead>{t.table.bedBath}</TableHead>
              <TableHead>{t.table.sqft}</TableHead>
              <TableHead>{t.table.status}</TableHead>
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
                  {canWrite ? t.emptyWrite : t.empty}
                </TableCell>
              </TableRow>
            ) : (
              apartments?.map((apartment) => (
                <TableRow
                  key={apartment.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToApartment(apartment.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToApartment(apartment.id);
                    }
                  }}
                >
                  <TableCell>
                    <span className="font-medium text-sm">
                      {apartment.unitNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.bedBathValue
                      .replace('{bedrooms}', String(apartment.bedrooms))
                      .replace(
                        '{bathrooms}',
                        String(Number(apartment.bathrooms)),
                      )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {apartment.sqft ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={apartment.status}
                      labels={statusLabels}
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
                              aria-label={t.actions.ariaLabel}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => goToApartment(apartment.id)}
                          >
                            <EyeIcon className="size-3.5 mr-1.5" />
                            {shared.view}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(apartment)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(apartment)}
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

      {/* ── Create Apartment Dialog ────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.createDialog.title}</DialogTitle>
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
              t={t}
              shared={shared}
              statusLabels={statusLabels}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => {
                  setCreateOpen(false);
                  resetCreate(DEFAULT_VALUES);
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

      {/* ── Edit Apartment Dialog ──────────────────────────────────────────── */}
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
            <ApartmentFormFields
              register={regEdit}
              control={controlEdit}
              errors={editErrors}
              idPrefix="ae"
              t={t}
              shared={shared}
              statusLabels={statusLabels}
            />
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
                {deleteTarget?.unitNumber}
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
    </div>
  );
}

// ── Shared form fields (create + edit dialogs) ─────────────────────────────────

function ApartmentFormFields({
  register,
  control,
  errors,
  idPrefix,
  t,
  shared,
  statusLabels,
}: {
  register: ReturnType<typeof useForm<ApartmentFormValues>>['register'];
  control: ReturnType<typeof useForm<ApartmentFormValues>>['control'];
  errors: ReturnType<
    typeof useForm<ApartmentFormValues>
  >['formState']['errors'];
  idPrefix: string;
  t: Dictionary['buildings']['floor'];
  shared: Dictionary['buildings']['shared'];
  statusLabels: Dictionary['buildings']['apartmentStatus'];
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-unit`}>
          {t.form.unitNumber} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-unit`}
          placeholder={t.form.unitNumberPlaceholder}
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
            {t.form.bedrooms} <span className="text-destructive">*</span>
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
            {t.form.bathrooms} <span className="text-destructive">*</span>
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
            {t.form.sqft}{' '}
            <span className="text-muted-foreground font-normal">
              {shared.optional}
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
          <Label htmlFor={`${idPrefix}-status`}>{t.form.status}</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val) => field.onChange(val as ApartmentStatus)}
              >
                <SelectTrigger id={`${idPrefix}-status`} className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value
                        ? (statusLabels[value as ApartmentStatus] ?? value)
                        : t.form.selectStatus
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          {t.form.notes}{' '}
          <span className="text-muted-foreground font-normal">
            {shared.optional}
          </span>
        </Label>
        <Textarea id={`${idPrefix}-notes`} rows={2} {...register('notes')} />
      </div>
    </>
  );
}
